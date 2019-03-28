const fs = require('fs');
const pathModule = require('path');
const chokidar = require('chokidar');
const tinify = require("tinify");
const Jimp = require("jimp");

const SUPPORTED_EXT = ['png', 'jpg', 'jpeg', 'gif', 'bmp'];

function isFolder(path) {
    if(isExists(path)) {
        return fs.statSync(path).isDirectory();
    }
    else {
        path = fixPath(path);
        let name = getNameFromPath(path);
        let parts = name.split('.');
        return parts.length === 1;
    }
}

function isExists(path) {
    return fs.existsSync(path);
}

function fixPath(path) {
    return path.trim().split('\\').join('/');
}

function getNameFromPath(path) {
    let filename = fixPath(path).split("/").pop();
    let index = filename.lastIndexOf('.');

    return filename.substring(0, index);
}

function getExtFromPath(path) {
    return path.trim().split('.').pop().toLowerCase();
}

function getJimpFormat(format) {
    switch (format) {
        case "png":
            return Jimp.MIME_PNG;
        case "gif":
            return Jimp.MIME_GIF;
        case "bmp":
            return Jimp.MIME_BMP;
        default:
            return Jimp.MIME_JPEG;
    }
}

function getFolderFilesList(dir, base = '', list = []) {
    let files = fs.readdirSync(dir);
    for(let file of files) {
        let path = pathModule.resolve(dir, file);
        if(isFolder(path) && path.toUpperCase().indexOf('__MACOSX') < 0) {
            list = getFolderFilesList(path, base + file + '/', list);
        }
        else {
            list.push({
                name: (base ? base : '') + file,
                path: path
            });
        }
    }

    return list;
}

function getSubFoldersList(dir, list = []) {
    let files = fs.readdirSync(dir);
    for(let file of files) {
        let path = pathModule.resolve(dir, file);
        if(isFolder(path) && path.toUpperCase().indexOf('__MACOSX') < 0) {
            list.push(path);
            list = getSubFoldersList(path, list);
        }
    }

    return list;
}

class WebpackImagesResizer {
    constructor(list, options = {}) {
        if(!Array.isArray(list)) list = [list];

        this.list = list;

        options.format = options.format || "*";
        options.format = options.format.toString().toLowerCase();
        if (SUPPORTED_EXT.indexOf(options.format) < 0) options.format = "*";

        options.width = options.width || Jimp.AUTO;
        options.height = options.height || Jimp.AUTO;

        options.noCrop = options.noCrop || false;

        options.quality = options.quality || 100;

        options.tinify = options.tinify || false;
        options.tinifyKey = options.tinifyKey || "";

        tinify.key = options.tinifyKey;

        this.options = options;

        this.changed = true;
        
        this.watcher = null;
        this.watchStarted = false;

        this.onFsChanges = this.onFsChanges.bind(this);
    }

    addDependency(dependencies, path) {
        if(Array.isArray(dependencies)) dependencies.push(path);
        else dependencies.add(path);
        
        this.addToWatch(path);
    }
    
    addToWatch(path) {
        if(!this.watcher) {
            this.watcher = chokidar.watch(path, {ignoreInitial: true});
            this.watcher.on('all', this.onFsChanges);
        }
        else {
            this.watcher.add(path);
        }
    }

    onFsChanges() {
        this.changed = true;
    }

    loadImage(item) {
        return Jimp.read(item.src)
            .then(image => {
                item.image = image;
            })
            .catch(e => {
                console.error("Error reading " + item.src);
            });
    }

    loadImageBuffer(item) {
        return item.image.getBufferAsync(item.format)
            .then(buffer => {
                item.buffer = buffer;
            })
            .catch(e => {
                console.error("Error reading buffer " + item.src);
            });
    }

    tinifyImage(item) {
        if (!this.options.tinify) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            tinify.fromBuffer(item.buffer).toBuffer((err, result) => {
                if (err) {
                    console.log(err);
                    reject();
                    return;
                }

                item.buffer = result;
                resolve();
            });
        });
    }

    apply(compiler) {
        compiler.hooks.emit.tapAsync('WebpackImagesResizer', (compilation, callback) => {
            let files = [];

            for(let item of this.list) {
                let srcPath = item.src;
                let path = fixPath(item.src);

                if(isFolder(path)) {
                    if(isExists(srcPath)) {
                        let list = getFolderFilesList(path);
                        for(let file of list) {
                            let ext = getExtFromPath(file.path);
                            if(SUPPORTED_EXT.indexOf(ext) >= 0) files.push({src: file.path, dest: item.dest + '/' + file.name});
                        }
                    }

                    this.addDependency(compilation.contextDependencies, srcPath);

                    let subFolders = getSubFoldersList(srcPath);
                    for(let folder of subFolders) {
                        this.addDependency(compilation.contextDependencies, folder);
                    }
                }
                else {
                    if(isExists(srcPath)) {
                        files.push({src: path, dest: item.dest});
                    }

                    this.addDependency(compilation.fileDependencies, srcPath);
                }
            }

            if(this.watchStarted && !this.changed) {
                callback();
                return;
            }

            let p = [];

            for(let file of files) {
                p.push(this.loadImage(file));
            }

            let options = this.options;

            Promise.all(p).then(() => {

                let b = [];

                for(let item of files) {
                    let image = item.image;

                    let format, ext;

                    if (options.format === "*") {
                        ext = getExtFromPath(item.src);
                        format = getJimpFormat(ext);
                    } else {
                        ext = options.format;
                        format = getJimpFormat(options.format);
                    }

                    let width = options.width;
                    let height = options.height;

                    if (options.noCrop && image.bitmap.width !== image.bitmap.height) {
                        let isWidthMax = image.bitmap.width > image.bitmap.height;
                        if (isWidthMax) {
                            height = Jimp.AUTO;
                        } else {
                            width = Jimp.AUTO;
                        }
                    } else {
                        if (typeof width === "string" && width.substr(width.length - 1) === "%") {
                            width = Math.floor(image.bitmap.width * (parseInt(width) / 100));
                        }

                        if (typeof height === "string" && height.substr(height.length - 1) === "%") {
                            height = Math.floor(image.bitmap.height * (parseInt(height) / 100));
                        }
                    }

                    image.resize(width, height).quality(options.quality);

                    item.format = format;

                    b.push(this.loadImageBuffer(item));
                }

                Promise.all(b).then(() => {
                    let t = [];

                    for(let item of files) {
                        t.push(this.tinifyImage(item));
                    }

                    Promise.all(t).then(() => {
                        for(let item of files) {
                            (function (item) {
                                compilation.assets[item.dest] = {
                                    source: function () {
                                        return item.buffer;
                                    },
                                    size: function () {
                                        return item.buffer.length;
                                    }
                                };
                            })(item);
                        }

                        callback();
                    });
                });
            });

            this.changed = false;
            this.watchStarted = true;
        });
    }
}

module.exports = WebpackImagesResizer;
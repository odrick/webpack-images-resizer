# webpack-images-resizer

[![Stats](https://nodei.co/npm/webpack-images-resizer.png?downloads=true&stars=true)](https://www.npmjs.com/package/webpack-free-tex-packer) \
Webpack images resizer plugin 

# Install
   
$ npm install webpack-images-resizer
   
# Usage

**webpack.config.js**

```js
const path = require('path');
const WebpackImagesResizer = require('webpack-images-resizer');

let list = [];
list.push({src: path.resolve(__dirname, 'assets/1.png'), dest: 'assets/1.png'});
list.push({src: path.resolve(__dirname, 'assets/2.png'), dest: 'assets/2.png'});
list.push({src: path.resolve(__dirname, 'assets/dir'), dest: 'assets/dir'});

module.exports = {
    entry: [
        './src/index',
        'webpack-dev-server/client?http://localhost:8080'
    ],
    output: {filename: 'index.js'},
    mode: 'development',
    plugins: [
        new WebpackImagesResizer(list, {width: "50%"})
    ]
};
```
---

**Plugin arguments**

| prop             | type            | description                                                                                      |
| ---              | ---             | ---                                                                                              |
| list             | Object or array | {src: "images or folders path", dest: "relative output path"}                                    |
| options          | Object          | resize option                                                                                    |

---

**Resize options**

* `format` - format of output files (png, jpg, gif, bmp or *). Default: *
* `width` - width of output images (fixed, percentage or -1 for auto). Default: **-1**
* `height` - height of output images (fixed, percentage or -1 for auto). Default: **-1**
* `noCrop` - disable the crop feature. If true it will choose the max size between height/width. Default: **false**
* `quality` - quality of output images (from 0 to 100). Default: **100**
* `tinify` - tinify images using [TinyPNG](https://tinypng.com/). Default: **false**
* `tinifyKey` - [TinyPNG key](https://tinypng.com/developers). Default: **""**

---

**Full example**

https://github.com/odrick/webpack-images-resizer/tree/master/example

 * download
 * npm install
 * npm start
 * open http://localhost:8080

---

# Used libs

* **Jimp** - https://github.com/oliver-moran/jimp
* **Chokidar** - https://github.com/paulmillr/chokidar
* **Tinify** - https://github.com/tinify/tinify-nodejs

---
License: MIT

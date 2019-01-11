const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const argv = require('optimist').argv;

const WebpackImagesResizer = require('webpack-images-resizer');

let entry = [
    './src/index'
];

let devtool = 'eval-source-map';
let output = 'index.js';
let NODE_ENV = argv.build ? 'production': 'development';

let plugins = [];

plugins.push(new CopyWebpackPlugin([{from: 'src/resources', to: './'}]));

plugins.push(new webpack.DefinePlugin({
	'process.env.NODE_ENV': JSON.stringify(NODE_ENV)
}));

let list = [];
list.push({src: path.resolve(__dirname, 'assets/1.png'), dest: 'assets/1.png'});
list.push({src: path.resolve(__dirname, 'assets/2.png'), dest: 'assets/2.png'});
list.push({src: path.resolve(__dirname, 'assets/dir'), dest: 'assets/dir'});

plugins.push(new WebpackImagesResizer(list, {width: "50%"}));

if(!argv.build) {
    entry.push('webpack-dev-server/client?http://localhost:8080');
}

let config = {
    entry: entry,
    output: { filename: output },
    devtool: devtool,
	mode: NODE_ENV,
    module: {
        rules: [
            {
                test: /\.js$/,
                include: [
                    path.resolve(__dirname, 'src')
                ],
                use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env']
					}
				}
            }
        ]
    },
    plugins: plugins
};

module.exports = config;
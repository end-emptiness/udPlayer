var webpack = require('webpack');
var path = require('path');

var libraryName = 'udPlayer';
var env = process.env.WEBPACK_ENV;
var DEV_PATH = path.resolve(__dirname,'src');
var BUILD_PATH = path.resolve(__dirname,'dist');

module.exports = {
    entry: './src/' + libraryName + '.js',
    output: {
        filename: libraryName + '.min.js',
        path: BUILD_PATH,
        library: libraryName,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    devtool: 'source-map',
    devServer: {
        publicPath: '/dist/',
        port: 8090
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: DEV_PATH,
                loader: 'babel-loader',
                options: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.scss$/,
                include: DEV_PATH,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader'
                ]
            }
        ]
    },
    plugins: [
        new webpack.BannerPlugin('UDPlayer develop by xp')
    ]
};

if(env === 'build'){
    module.exports.plugins.push(
        new webpack.optimize.UglifyJsPlugin({
            sourceMap:true,
            minimize: true,
            compress: true
        })
    );
}
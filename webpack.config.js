const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals')

module.exports = {
  entry: './src/liara.js',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    filename: './dist/liara.js',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loaders: ['shebang-loader', 'babel-loader']
      },
    ],
  },
  plugins: [
    new webpack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true }),
  ],
};
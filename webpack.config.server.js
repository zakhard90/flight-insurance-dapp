const path = require('path');
const webpack = require('webpack')

const NodemonPlugin = require('nodemon-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/server/index.js',
  target: 'node',
  watch: true,
  externals: [nodeExternals()],
  output: {
    filename: 'api.js',
    path: path.resolve(__dirname, 'build/server')
  },
  plugins: [
    new NodemonPlugin(),
    new webpack.HotModuleReplacementPlugin(),
  ],

  devServer: {
    port: 8080,
    watchOptions: {
      aggregateTimeout: 300,
      poll: true
    },
    contentBase: path.resolve(__dirname, 'build/server'),
  }
}
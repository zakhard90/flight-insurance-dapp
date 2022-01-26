// const webpack = require('webpack');
// const path = require('path')
// const nodeExternals = require('webpack-node-externals')
// const NodemonPlugin = require('nodemon-webpack-plugin')

// module.exports = {
//   entry: [
//     'webpack/hot/poll?1000',
//     './web/src/server/index'
//   ],
//   watch: true,
//   target: 'node',
//   output: {
//     path: path.join(__dirname, './web/src/server/dist/'),
//     filename: 'server-bundle.js'
//   },
//   devServer: {
//     hot: true,
//     open: true,
//     inline: true,
//     watchContentBase: true,
//     contentBase: __dirname + './web/src/server/dist/'
//   },
//   externals: [nodeExternals({
//     allowlist: ['webpack/hot/poll?1000']
//   })],
//   plugins: [
//     new NodemonPlugin(),
//     new webpack.HotModuleReplacementPlugin(),
//   ]
// }
/*
const webpack = require('webpack')
const path = require('path')
const nodeExternals = require('webpack-node-externals')
// const StartServerPlugin = require('start-server-webpack-plugin')

module.exports = {
  entry: [
    'webpack/hot/poll?1000',
    './web/src/server/index'
  ],
  watch: true,
  target: 'node',
  externals: [nodeExternals({
    allowlist: ['webpack/hot/poll?1000']
  })],
  module: {
    rules: [{
      test: /\.js?$/,
      use: 'babel-loader',
      exclude: /node_modules/
    }]
  },
  plugins: [
    // new StartServerPlugin('server.js'),
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      "process.env": {
        "BUILD_TARGET": JSON.stringify('server')
      }
    }),
  ],
  output: {
    path: path.resolve(__dirname, 'build/server'),
    filename: 'server.js'
  },
  devServer: {
    hot: true,
    open: true,
    inline: true,
    watchContentBase: true,
    contentBase: path.resolve(__dirname, 'build/server'),
  }
}*/

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
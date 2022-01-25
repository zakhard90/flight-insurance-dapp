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

const webpack = require('webpack')
const path = require('path')
const nodeExternals = require('webpack-node-externals')
const StartServerPlugin = require('start-server-webpack-plugin')

module.exports = {
  entry: [
    './web/src/server/server.js'
  ],
  watch: true,
  target: 'node',
  externals: [nodeExternals({
    allowlist: ['webpack/hot/poll?1000']
  })],
  // module: {
  //   rules: [{
  //     test: /\.js?$/,
  //     use: 'babel-loader',
  //     exclude: /node_modules/
  //   }]
  // },
  plugins: [
    new StartServerPlugin('server.js'),
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
    port: 8080,
    open: true,
    inline: true,
    watchContentBase: true,
    writeToDisk: true,
    contentBase: path.resolve(__dirname, 'build/server/server.js')
  }
}
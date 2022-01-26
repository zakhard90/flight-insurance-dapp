const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/dapp/index.js",
  output: {
    path: path.join(__dirname, "./src/dapp"),
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ['file-loader']
      },
      {
        test: /\.html$/,
        use: "html-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin([{ from: "./src/dapp/index.html", to: "index.html" }])
  ],
  resolve: {
    extensions: [".js"]
  },
  devServer: {
    contentBase: path.join(__dirname, "dapp"),
    port: 8000, 
    hot: true,
    compress: true
  },
};

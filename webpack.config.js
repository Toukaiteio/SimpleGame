const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
module.exports = {
  mode: "production", // 自动启用代码压缩[4,8](@ref)
  entry: "./Resources/Scripts/GameInit.js",

  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "./",
    filename: "[name].[contenthash].min.js", // 带哈希的文件名[9](@ref)

  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        // 更高效的 JS 压缩工具[4](@ref)
        extractComments: true, // 移除注释
        terserOptions: {
          compress: { drop_console: true }, // 移除 console 语句
        },
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[path][name].[ext]",
              context: "Resources",
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(), // 构建前清理 dist 目录[5](@ref)
    new HtmlWebpackPlugin({
      template: "./index_publish.html", // 原始 HTML 模板路径
      filename: "index.html", // 输出文件名
      inject: "body", // 将 JS 注入到 body 底部
      minify: {
        // HTML 压缩配置[5](@ref)
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
      },
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "./Resources/Assets", to: "Resources/Assets" },
        { from: "./Resources/I18n", to: "Resources/I18n" },
      ],
    })
  ],
};

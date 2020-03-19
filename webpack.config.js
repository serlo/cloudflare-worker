const path = require('path')
const webpack = require('webpack')

module.exports = {
  mode: 'production',
  entry: path.join(__dirname, 'src'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        loader: require.resolve('ts-loader')
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx']
  },
  optimization: {
    usedExports: true
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ],
  target: 'webworker',
  node: {
    fs: 'empty'
  }
}

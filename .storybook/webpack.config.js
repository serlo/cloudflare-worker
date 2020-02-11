module.exports = ({ config }) => {
  config.module.rules.push({
    test: /\.(ts|tsx)$/,
    exclude: /node_modules/,
    loader: require.resolve('ts-loader')
  })
  config.resolve.extensions.push('.ts', '.tsx')
  config.devServer = {
    stats: 'errors-only'
  }
  return config
}

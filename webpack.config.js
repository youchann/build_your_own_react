module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: './bundle.js',
    path: `${__dirname}/dist`
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader'
      }
    ]
  },
  mode: 'development'
}

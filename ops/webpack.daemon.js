
const path = require('path')

module.exports = {

  target: 'node',
  externals: ['pg-native', 'electron'],

  entry: {
    autobirther: './src/autobirther.js',
    sync: './src/sync.js',
    console: './src/console.js',
  },

  output: {
    path: path.join(__dirname, '../build'),
    filename: '[name].bundle.js',
  },

  resolve: {
    extensions: ['.js', '.json', '.node'],
    // scrypt.js says "if target is node, use c++ implementation"
    // but I don't want any c++, let's force the js version to load
    alias: { 'scrypt.js': 'scryptsy' },
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['es2015'], },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.node$/,
        use: {
          loader: 'binary-loader',
        },
      },
    ],
  },

}

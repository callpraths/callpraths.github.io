const path = require('path');

module.exports = {
	optimization: {
		// We no not want to minimize our code.
		minimize: false
	},
    entry: path.resolve('./src/index.js'),
    output: {
      path: path.resolve('./build'),
      filename: 'bundle.js'
    },
    module: {
        rules: [{ 
          test: /\.js$/, 
          exclude: /node_modules/, 
          use: [{
              loader: "babel-loader" 
          }]
        }]
      }
  };
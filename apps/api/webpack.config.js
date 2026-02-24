const path = require('path');

module.exports = (options, webpack) => {
  return {
    ...options,
    entry: {
      main: options.entry,
      serverless: path.join(__dirname, 'src', 'serverless.ts'),
    },
    externals: [],
    output: {
      ...options.output,
      filename: '[name].js',
      libraryTarget: 'commonjs2',
    },
  };
};
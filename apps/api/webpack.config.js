const path = require('path');

module.exports = (options, webpack) => {
  return {
    ...options,
    entry: {
      serverless: path.join(__dirname, 'src', 'serverless.ts'),
    },
    externals: [
      function ({ request }, callback) {
        if (!request) return callback();
        // Bundle @exim/* workspace packages (their main points to TS source)
        if (request.startsWith('@exim/')) {
          return callback();
        }
        // Externalize all other node_modules — available at runtime
        if (!request.startsWith('.') && !path.isAbsolute(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ],
    output: {
      ...options.output,
      filename: '[name].js',
      libraryTarget: 'commonjs2',
    },
  };
};
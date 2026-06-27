const http = require('node:http');

const originalRequest = http.request;
http.request = function requestWithInsecureParser(options, callback) {
  if (options && typeof options === 'object') {
    options.insecureHTTPParser = true;
  }
  return originalRequest.call(this, options, callback);
};

module.exports = {
  '/api': {
    target: 'http://localhost:8030',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    agent: new http.Agent({ keepAlive: true })
  }
};
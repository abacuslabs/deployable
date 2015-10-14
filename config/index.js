var _ = require('lodash');
var path = require('path');

var config = {
  URL: "http://127.0.0.1",
  GITHUB_CLIENT_ID: "",
  GITHUB_CLIENT_SECRET: "",
  SESSION_KEY: "",
  SCRIPTS_DIR: path.join(__dirname, '../scripts/'),
  BUILD_DIR: path.join(__dirname, '../.tmp/')
};

module.exports = _.defaults(require('./config'), config);
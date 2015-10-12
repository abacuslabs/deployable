var _ = require('lodash');
var dotenv = require('dotenv');
var path = require('path')

// run in silent mode
dotenv.config({silent:true})

// load dotenv config vars if available
dotenv.load();

var config = {
  URL: "http://127.0.0.1",
  GITHUB_CLIENT_ID: "",
  GITHUB_CLIENT_SECRET: "",
  SESSION_KEY: "",
  SCRIPTS_DIR: path.join(__dirname, '../scripts/'),
  BUILD_DIR: path.join(__dirname, '../.tmp/')
};
config = _.defaults(process.env, config);

module.exports = config;
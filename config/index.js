var _ = require('lodash');
var dotenv = require('dotenv');

// run in silent mode
dotenv.config({silent:true})

// load dotenv config vars if available
dotenv.load();

var config = {
  URL: "http://127.0.0.1",
  GITHUB_CLIENT_ID: "",
  GITHUB_CLIENT_SECRET: "",
  SESSION_KEY: ""
};
config = _.defaults(process.env, config);

module.exports = config;
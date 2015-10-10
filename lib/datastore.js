var Promise = require('bluebird')
var Datastore = require('nedb')
Promise.promisifyAll(Datastore.prototype);
var path = require('path')
var Promise = require('bluebird')
var _ = require('lodash')

var ds = {}

ds.repos = new Datastore({
  filename: path.join(__dirname, '../.data/repos.db'),
  autoload: true
})

ds.repos.ensureIndex({ fieldName: 'id', unique: true });

ds.builds = new Datastore({
  filename: path.join(__dirname, '../.data/builds.db'),
  autoload: true
})

ds.repos.ensureIndex({ fieldName: '_id', unique: true });

ds.deploys = new Datastore({
  filename: path.join(__dirname, '../.data/deploys.db'),
  autoload: true
})

ds.signoffs = new Datastore({
  filename: path.join(__dirname, '../.data/signoffs.db'),
  autoload: true
})

module.exports = ds
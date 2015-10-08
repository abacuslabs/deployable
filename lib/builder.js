var Promise = require('bluebird')
var _ = require('lodash')
var fs = Promise.promisifyAll(require('fs'))
var path = require('path')
var exec = require('child_process').exec;
var uuid = require('node-uuid');
var ds = require('./datastore')

var SCRIPTS_DIR = path.join(__dirname, '../scripts/')
var BUILD_DIR = path.join(__dirname, '../.tmp/')

var execAndLog = function(script, repoId, buildId) {

  var cmdString = [path.join(SCRIPTS_DIR, script)]

  arguments = _.values(arguments)
  _.each(arguments.slice(1, arguments.length), function(argument) {
    cmdString.push("\""+argument+"\"")
  })

  return new Promise(function(resolve, reject) {
    var child = exec(cmdString.join(' '), function(err, stdout, stderr) {
      if (err) {
        return reject(err)
      }

      resolve()
    })

    child.stdout.on('data', function(data) {
      fs.appendFile(path.join(BUILD_DIR, buildId + ".log"), data.toString())
    })
  })

}

var startBuild = module.exports.startBuild = function(buildId) {

  return ds.builds.findOneAsync({
    _id: buildId
  })
  .then(function(build) {
    this.build = build
  })
  .then(function() {
    return execAndLog('bootstrap', this.build.repo_id, this.build._id, this.build.link, this.build.sha)
  })
  .then(function() {
    return execAndLog('build', this.build.repo_id, this.build._id, "nodejs")
  })
  .then(function() {
    return execAndLog('compile', this.build.repo_id, this.build._id)
  })

}

var createBuild = module.exports.createBuild = function(repoId, sha, link) {

  return ds.builds.insertAsync({
    _id: uuid.v4(),
    repo_id: repoId,
    sha: sha,
    link: link
  })
  .then(function(build) {
    process.nextTick(function() {
      startBuild(build._id)
    })
    return build
  })
  .then(function(build) {
    return build._id
  })

}


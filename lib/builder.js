var Promise = require('bluebird')
var _ = require('lodash')
var fs = Promise.promisifyAll(require('fs'))
var path = require('path')
var exec = require('./exec')
var uuid = require('node-uuid');
var ds = require('./datastore')
var config = require('../config')

var execAndLog = function(script, repoId, buildId) {

  var cmdString = [path.join(config.SCRIPTS_DIR, script)]

  arguments = _.values(arguments)
  _.each(arguments.slice(1, arguments.length), function(argument) {
    cmdString.push("\""+argument+"\"")
  })

  var cmd = cmdString.join(' ')
  var logfile = path.join(config.BUILD_DIR, "build-" + buildId + "log")

  return exec.execAndLog(cmd, logfile)

}

var startBuild = module.exports.startBuild = function(buildId) {

  return ds.builds.findOneAsync({
    _id: buildId
  })
  .then(function(build) {
    this.build = build
  })
  // this step creates the proper environment
  // and directories so that the build can
  // properly execute
  .then(function() {
    return execAndLog('bootstrap', this.build.repo_id, this.build._id, this.build.link, this.build.sha)
  })
  // build step, relies of Heroku buildpacks
  .then(function() {
    return execAndLog('build', this.build.repo_id, this.build._id, "nodejs")
  })
  // this step compresses the build directory
  // into a nice tarball
  .then(function() {
    return execAndLog('compile', this.build.repo_id, this.build._id)
  })
  .then(function() {
    this.build.finished = true
  })
  .catch(function(err) {
    this.build.error = true
  })
  .then(function() {
    return ds.builds.updateAsync({
      _id: this.build._id
    }, this.build)
  })

}

var createBuild = module.exports.createBuild = function(repoId, sha, link) {

  return ds.builds.insertAsync({
    _id: uuid.v4(),
    repo_id: repoId,
    sha: sha,
    link: link,
    created_at: Date.now()
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

var getLogs = module.exports.getLogs = function(buildId) {

  return fs.readFileAsync(path.join(config.BUILD_DIR, "build-" + buildId + ".log"), "utf-8")
    .then(function(data) {
      return data
    })

}

var downloadBuild = module.exports.downloadBuild = function(buildId) {

  return fs.createReadStream(path.join(config.BUILD_DIR, buildId + ".tar.gz"))

}

var getBuildsForCommits = module.exports.getBuildsForCommits = function(repoId, commits) {
  return ds.builds.findAsync({
    repo_id: repoId,
    sha: {
      $in: _.pluck(commits, "sha")
    }
  })
  .then(function(builds) {
    builds.sort(function(a, b) {
      return (b.created_at || 0) - (a.created_at || 0);
    })
    return builds
  })
}

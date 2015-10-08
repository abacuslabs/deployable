var Promise = require('bluebird')
var _ = require('lodash')
var fs = Promise.promisifyAll(require('fs'))
var path = require('path')
var exec = require('child_process').exec;
var uuid = require('node-uuid');
var scriptsDir = path.join(__dirname, '../scripts/')
var logsDir = path.join(__dirname, '../.logs/')

var getStackInfo = function(stackName) {

  return fs.readFileAsync(path.join(__dirname, '/../config/stacks', stackName, 'build.json'))
    .then(function(stackBuildData) {
      return JSON.parse(stackBuildData)
    })
    .then(function(buildInfo) {
      return {
        "buildpack": buildInfo.buildpack,
        "git": buildInfo.git,
        "name": stackName
      }
    })

}

var getStacks = module.exports.getStacks = function() {

  return fs.readdirAsync(path.join(__dirname, '/../config/stacks'))
    .map(function(stack) {
      return getStackInfo(stack)
    })

}

var execAndLog = function(script, buildId) {

  var cmdString = [path.join(scriptsDir, script)]

  arguments = _.values(arguments)
  _.each(arguments.slice(1, arguments.length), function(argument) {
    cmdString.push(argument)
  })

  return new Promise(function(resolve, reject) {
    var child = exec(cmdString.join(' '), function(err, stdout, stderr) {
      if (err) {
        return reject(err)
      }

      resolve()
    })

    child.stdout.on('data', function(data) {
      fs.appendFile(path.join(logsDir, buildId), data.toString())
    })
  })

}

var buildStack = module.exports.buildStack = function(stackName, buildId) {

  buildId = buildId || uuid.v4()

  return getStacks()
    .bind({})
    .then(function(stacks) {
      return _.find(stacks, function(stack) {
        return stack.name === stackName
      })
    })
    .then(function(stack) {
      this.stack = stack
    })
    .then(function() {
      return execAndLog('bootstrap', buildId, this.stack.git)
    })
    .then(function() {
      return execAndLog('build', buildId, this.stack.git, this.stack.buildpack)
    })
    .then(function() {
      return execAndLog('compile', buildId)
    })
    .then(function() {
      return buildId
    })

}

var getLogs = module.exports.getLogs = function(buildId) {

  return fs.readFileAsync(path.join(logsDir, buildId), "utf-8")
    .then(function(data) {
      return data
    })

}
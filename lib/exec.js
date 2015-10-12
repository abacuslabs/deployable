var Promise = require('bluebird')
var _ = require('lodash')
var path = require('path')
var exec = require('child_process').exec;
var fs = require('fs')

var execAndLog = module.exports.execAndLog = function(cmd, logfile) {

  // fs.closeSync(fs.openSync(logfile, 'w'));

  return new Promise(function(resolve, reject) {
    var child = exec(cmd, function(err, stdout, stderr) {
      if (err) {
        console.error(err)
        return reject(err)
      }

      resolve()
    })

    child.stdout.on('data', function(data) {
      fs.appendFile(logfile, data.toString())
    })
    child.stderr.on('data', function(data) {
      fs.appendFile(logfile, data.toString())
    })
  })

}

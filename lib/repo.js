var ds = require('./datastore')
var Github = require('github')
var Promise = require('bluebird')

module.exports.getRepoAndGithub = function(repoId) {

  return ds.repos.findOneAsync({
    id: parseInt(repoId)
  })
  .then(function(repo) {
    var github = new Github({
      version: '3.0.0'
    })

    github.authenticate({
      type: 'oauth',
      token: repo.token
    })

    github.repos = Promise.promisifyAll(github.repos)

    return [repo, github]
  })

}
var ds = require('./datastore')
var Github = require('github')
var Promise = require('bluebird')

var getRepoAndGithub = module.exports.getRepoAndGithub = function(repoId) {

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

var commitRange = module.exports.commitRange = function(repoId, shaFrom, shaTo) {

  if (shaFrom === shaTo) {
    return []
  }

  return getRepoAndGithub(repoId)
    .spread(function(repo, github) {
      return github.repos.compareCommitsAsync({
        user: repo.user,
        repo: repo.name,
        base: shaTo,
        head: shaFrom
      })
      .then(function(diff) {
        return diff.commits
      })
    })

}
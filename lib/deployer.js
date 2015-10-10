var ds = require('./datastore')
var Promise = require('bluebird')
var Github = require('github')
var repoHelper = require('./repo')
var _ = require('lodash')

var findLastDeployForEnv = function(repoId, env) {
  var q = ds.deploys.findOne({
    repo_id: repoId,
    env: env
  })
  .sort({
    created_at: 1
  })

  q = Promise.promisify(q.exec, q)

  return q().then(function(deploy) {
    return deploy || null
  })
}

var lastDeploys = module.exports.lastDeploys = function(repoId) {
  return Promise.props({
    staging: findLastDeployForEnv(repoId, 'staging'),
    production: findLastDeployForEnv(repoId, 'production')
  })
}

var commitRange = module.exports.commitRange = function(repoId, shaFrom, shaTo) {

  if (shaFrom === shaTo) {
    return []
  }

  return repoHelper.getRepoAndGithub(repoId)
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

var canDeploy = module.exports.canDeploy = function(repoId, env) {



}

var startDeploy = module.exports.startDeploy = function(repoId, env) {

  // first determine if we can do this deploy


}
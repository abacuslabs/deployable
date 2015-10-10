var ds = require('./datastore')
var Promise = require('bluebird')
var Github = require('github')
var repoLib = require('./repo')
var _ = require('lodash')
var builder = require('./builder')

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

var startStagingDeploy = function(repoId) {

  // 1. find the latest SHA & build
  return Promise
    .resolve()
    .then(function() {
      return repoLib.getRepoAndGithub(repoId)
    })
    .spread(function(repo, github) {
      this.repo = repo

      return github.repos.getCommitsAsync({
        user: repo.user,
        repo: repo.name,
        per_page: 100
      })
    })
    .then(function(commits) {
      this.commits = commits
      this.shas = _.pluck(this.commits, "sha")
    })
    .then(function() {
      return builder.getBuildsForCommits(this.repo.id, this.commits)
    })
    .then(function(builds) {
      this.builds = _.filter(builds, function(build) {
        return build.download
      })
    })
    .then(function() {
      var buildsBySha = _.groupBy(this.builds, function(build) {
        return build.sha
      })
      for (var i = 0; i < this.shas.length; i++) {
        var sha = this.shas[i];
        if (buildsBySha[sha]) {
          return _.first(buildsBySha[sha])
        }
      }
    })
    .then(function(build) {
      if (!build) {
        throw new Error("A build could not be found")
      }

      return ds.deploys.insertAsync({
        sha: build.sha,
        build_id: build._id,
        env: "staging",
        repo_id: repoId,
        created_at: Date.now()
      })
    })
    .then(function(deploy) {
      // do deploy here
    })

}

var startDeploy = module.exports.startDeploy = function(repoId, env) {

  // first determine if we can do this deploy

  // 1. make sure there are no other deploys
  //    running the moment


  if (env === "staging") {
    return startStagingDeploy(repoId)
  } else if (env === "production") {
    return startProductionDeploy(repoId)
  } else {
    throw new Error("Environment unknown")
  }

}
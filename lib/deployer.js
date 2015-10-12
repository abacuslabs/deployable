var ds = require('./datastore')
var Promise = require('bluebird')
var Github = require('github')
var repoLib = require('./repo')
var _ = require('lodash')
var builder = require('./builder')
var signoffLib = require('./signoff')
var repoConfig = require('../config/repos')
var exec = require('./exec')
var config = require('../config')
var path = require('path')

var findLastDeployForEnv = function(repoId, env) {
  var q = ds.deploys.findOne({
    repo_id: repoId,
    env: env,
    error: {
      $exists: false
    }
  })
  .sort({
    created_at: -1
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

var doDeploy = function(deployId) {

  // this is where we'll execute a script to do the actual
  // deployment to each server
  return Promise
    .resolve()
    .then(function() {
      return ds.deploys.findAsync({
        _id: deployId
      })
    })
    .then(function(deploy) {
      this.deploy = deploy
    })
    .then(function() {
      return ds.repos.findAsync({
        id: deploy.repo_id
      })
    })
    .then(function(repo) {
      this.repo = repo
    })
    .then(function() {
      var envConfig = repoConfig[this.repo.full_name]
      if (!envConfig[this.deploy.env]) {
        throw new Error("Could not find proper environment configuration to deploy to")
      }
      return envConfig[this.deploy.env]
    })
    .each(function(server) {
      var cmd = [
        path.join(config.SCRIPTS_DIR, "/deploy"),
        this.deploy._id,
        server
      ].join(' ')
      var logfile = path.join(config.BUILD_DIR, "/deploy-" + this.deploy._id + '.log')

      return exec.execAndLog(cmd, logfile)
    })
    .then(function() {
      this.deploy.finished = true
    })
    .catch(function(err) {
      this.deploy.error = true
    })
    .then(function() {
      return ds.deploys.updateAsync({
        _id: this.deploy._id
      }, this.deploy)
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
        return build.finished
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
      process.nextTick(function() {
        doDeploy(deploy._id)
      })
    })

}

var startProductionDeploy = function(repoId) {

  return Promise
    .resolve()
    .then(function() {
      return lastDeploys(repoId)
    })
    .then(function(deploys) {
      this.stagingDeploy = deploys.staging
      this.productionDeploy = deploys.production

      if (!stagingDeploy) {
        throw new Error("Must deploy staging at least once")
      }

      if (!productionDeploy) {
        return []
      }

      return repoLib.commitRange(repoId, this.stagingDeploy.sha, this.productionDeploy.sha)
    })
    .then(function(commits) {
      this.commits = commits
    })
    .then(function() {
      return signoffLib.getSignoffInfo(repoId, this.commits)
    })
    .spread(function(signoffShaMap, signoffUserMap, canDeployProd) {
      if (!canDeployProd) {
        throw new Error("Needs signoffs from everyone in order to deploy")
      }
    })
    .then(function() {
      return ds.deploys.insertAsync({
        sha: this.stagingDeploy.sha,
        build_id: this.stagingDeploy.build_id,
        env: "production",
        repo_id: repoId,
        created_at: Date.now()
      })
    })
    .then(function(deploy) {
      process.nextTick(function() {
        doDeploy(deploy._id)
      })
    })

}

var startDeploy = module.exports.startDeploy = function(repoId, env) {

  return Promise
    .resolve()
    .then(function() {
      return findLastDeployForEnv(repoId, env)
    })
    .then(function(deploy) {
      if (deploy && !deploy.finished) {
        throw new Error("There's already a deploy in progress")
      }
    })
    .then(function() {
      if (env === "staging") {
        return startStagingDeploy(repoId)
      } else if (env === "production") {
        return startProductionDeploy(repoId)
      } else {
        throw new Error("Environment unknown")
      }
    })


}
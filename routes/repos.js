var express = require('express')
var router = express.Router()
var ds = require('../lib/datastore')
var Promise = require('bluebird')
var _ = require('lodash')
var builder = require('../lib/builder')
var md5 = require('md5')
var config = require('../config')
var reposConfig = require('../config/repos');
var definedRepos = _.keys(reposConfig)
var deployer = require('../lib/deployer');
var signoffLib = require('../lib/signoff');
var repoLib = require('../lib/repo');

var createRepoFromGithub = function(user, name) {
  Promise.resolve()
    .then(function() {
      if (!_.contains(definedRepos, user + "/" + name)) {
        throw new Error("Repository not defined in config")
      }
    })
    .then(function() {
      return req.github.repos.getAsync({
        user: user,
        repo: name
      })
    })
    .then(function(repo) {
      if (!repo.permissions.admin) {
        throw new Error("You don't have admin access to '" + url + "'")
      }

      return ds.repos.insertAsync({
        id: repo.id,
        full_name: repo.full_name
      })
    })
}

router.get('/create/:user/:repo', function(req, res, next) {

  var user = req.params.user
  var name = req.params.repo
  var fullName = user + "/" + name

  return ds.repos.findOneAsync({
    full_name: fullName
  })
  .then(function(repo) {
    if (!repo) {
      return createRepoFromGithub(user, name)
    }

    return repo
  })
  .then(function(repo) {
    res.redirect('/repos/' + repo.id + '/webhooks')
  })
  .catch(next)

})

router.use('/:id', function(req, res, next) {

  // ensure that the logged in user
  // has access to the github repository
  // that they are trying to access

  ds.repos.findOneAsync({
    id: parseInt(req.params.id)
  })
  .then(function(repo) {
    if (!repo) {
      throw new Error("Repository not found")
    }

    if (!_.contains(definedRepos, repo.full_name)) {
      throw new Error("Repository disabled in config")
    }

    req.repo = repo
  })
  .then(function() {

    if (!req.repo.user || !req.repo.name) {
      var url = req.repo.full_name.split("/")
      req.repo.user = url[0]
      req.repo.name = url[1]
    }

    return req.github.repos.getAsync({
      user: req.repo.user,
      repo: req.repo.name
    })
  })
  .then(function(githubRepo) {
    if (!githubRepo.permissions.admin) {
      throw new Error("You do not have permission to access this repository")
    }

    req.repo.token = req.user.token
    return ds.repos.updateAsync({
      _id: req.repo._id
    }, req.repo)
  })
  .then(function() {
    next()
  })
  .catch(next)

})

var getSignoffs = function(repoId, stagingDeploy, productionDeploy) {

  if (!stagingDeploy || !productionDeploy) {
    return [null, null, (stagingDeploy)]
  }

  return Promise
    .resolve()
    .bind({})
    .then(function() {
      return repoLib.commitRange(repoId, stagingDeploy.sha, productionDeploy.sha)
    })
    .then(function(commits) {
      return signoffLib.getSignoffInfo(repoId, commits)
    })

}

router.get('/:id', function(req, res, next) {

  Promise
    .resolve(req.repo)
    .bind({})
    // repo commits
    .then(function(repo) {
      this.repo = repo

      return req.github.repos.getCommitsAsync({
        user: repo.user,
        repo: repo.name,
        per_page: 100
      })
    })
    .then(function(commits) {
      this.commits = commits
    })
    // builds, deploys, and signoffs
    .then(function() {
      return Promise.all([
        builder.getBuildsForCommits(this.repo.id, this.commits),
        deployer.lastDeploys(this.repo.id)
      ])
    })
    .spread(function(builds, lastDeploys) {
      this.builds = builds
      this.lastDeploys = lastDeploys
    })
    // signoffs
    .then(function() {
      return getSignoffs(this.repo.id, this.lastDeploys.staging, this.lastDeploys.production)
    })
    .spread(function(signoffShaMap, signoffUserMap, canDeployProd) {
      this.signoffShaMap = signoffShaMap || {}
      this.signoffUserMap = signoffUserMap || {}
      this.canDeployProd = canDeployProd
    })
    .then(function() {
      var groupedBuilds = _.groupBy(this.builds, function(build) {
        return build.sha
      })

      var lastDeploys = this.lastDeploys
      var signoffShaMap = this.signoffShaMap

      this.commits = _.map(this.commits, function(commit) {
        commit.short_sha = commit.sha.substr(0, 6)
        commit.builds = groupedBuilds[commit.sha] || []
        commit.on_staging = (lastDeploys.staging && lastDeploys.staging.sha === commit.sha)
        commit.on_production = (lastDeploys.production && lastDeploys.production.sha === commit.sha)
        commit.signoff = signoffShaMap[commit.sha]
        return commit
      })

      var needsUserSignoff = _.chain(this.signoffUserMap).keys().contains(req.user.username).value()
      if (needsUserSignoff) {
        needsUserSignoff = !this.signoffUserMap[req.user.username]
      }
      this.needsUserSignoff = needsUserSignoff
    })
    .then(function() {
      res.render('repo', {
        repo: this.repo,
        commits: this.commits,
        lastDeploys: this.lastDeploys,
        canDeployProd: this.canDeployProd,
        needsUserSignoff: this.needsUserSignoff
      })
    })
    .catch(next)

})

router.get('/:id/signoff', function(req, res, next) {

  return Promise
    .resolve()
    .then(function() {
      return deployer.lastDeploys(req.repo.id)
    })
    .then(function(lastDeploys) {
      if (!lastDeploys.staging || !lastDeploys.production) {
        return []
      }

      return repoLib.commitRange(req.repo.id, lastDeploys.staging.sha, lastDeploys.production.sha)
    })
    .each(function(commit) {
      if (commit.author && commit.author.login === req.user.username) {
        return ds.signoffs.insertAsync({
          repo_id: req.repo.id,
          sha: commit.sha
        })
      }
    })
    .then(function() {
      res.redirect('/repos/'+req.repo.id)
    })
    .catch(next)

})

router.get('/:id/webhooks', function(req, res, next) {

  var hookUrl = config.URL + "/hooks/github/" + req.repo.id

  req.github.repos.getHooksAsync({
    user: req.repo.user,
    repo: req.repo.name,
    per_page: 30
  })
  .then(function(hooks) {
    return _.find(hooks, function(hook) {
      return hook.config && hook.config.url === hookUrl
    })
  })
  .then(function(hook) {
    if (hook) {
      return
    }

    return req.github.repos.createHookAsync({
      user: req.repo.user,
      repo: req.repo.name,
      name: "web",
      config: {
        url: hookUrl,
        content_type: 'json'
      }
    })
  })
  .then(function(hook) {
    res.redirect('/repos/' + req.repo.id)
  })
  .catch(next)

})

router.use('/:id/builds', require('./builds'))
router.use('/:id/deploys', require('./deploys'))

module.exports = router
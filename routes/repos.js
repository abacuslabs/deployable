var express = require('express')
var router = express.Router()
var ds = require('../lib/datastore')
var Promise = require('bluebird')
var _ = require('lodash')
var builder = require('../lib/builder')
var md5 = require('md5')
var config = require('../config')

var createRepoFromGithub = function(user, repo) {
  // lets see if the user has access
  return req.github.repos.getAsync({
    user: user,
    repo: repo
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
  var repoName = req.params.repo

  // make sure it doesn't exist first
  ds.repos.findOneAsync({
    full_name: user + "/" + repoName
  })
  .then(function(repo) {
    if (!repo) {
      return createRepoFromGithub(user, repoName)
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
      throw new Error("Repo not found")
    }

    req.repo = repo
  })
  .then(function() {
    var url = req.repo.full_name.split("/")
    var user = url[0]
    var repo = url[1]

    return req.github.repos.getAsync({
      user: user,
      repo: repo
    })
  })
  .then(function(githubRepo) {
    if (!githubRepo.permissions.admin) {
      throw new Error("You do not have permission to view this repository")
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

router.get('/:id', function(req, res, next) {

  Promise
    .resolve(req.repo)
    .bind({})
    .then(function(repo) {
      this.repo = repo

      var url = this.repo.full_name.split("/")
      var user = url[0]
      var repo = url[1]

      return req.github.repos.getCommitsAsync({
        user: user,
        repo: repo,
        per_page: 30
      })
    })
    .then(function(commits) {
      this.commits = commits
    })
    .then(function() {
      return ds.builds.findAsync({
        sha: {
          $in: _.pluck(this.commits, "sha")
        }
      })
    })
    .then(function(builds) {
      builds.sort(function(a, b) {
        return (b.created_at || 0) - (a.created_at || 0);
      })
      this.builds = builds
    })
    .then(function() {
      var groupedBuilds = _.groupBy(this.builds, function(build) {
        return build.sha
      })

      this.commits = _.map(this.commits, function(commit) {
        commit.short_sha = commit.sha.substr(0, 6)
        commit.builds = groupedBuilds[commit.sha] || []
        return commit
      })
    })
    .then(function() {
      return ds.deploys.findAsync({
        repo_id: this.repo.id
      })
    })
    .then(function(deploys) {

    })
    .then(function() {
      res.render('repo', {
        repo: this.repo,
        commits: this.commits
      })
    })
    .catch(next)

})

router.get('/:id/webhooks', function(req, res, next) {

  var url = req.repo.full_name.split("/")
  var user = url[0]
  var repo = url[1]

  var hookUrl = config.URL + "/hooks/github/" + req.repo.id

  req.github.repos.getHooksAsync({
    user: user,
    repo: repo,
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
      user: user,
      repo: repo,
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
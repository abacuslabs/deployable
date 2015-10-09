var express = require('express')
var router = express.Router()
var ds = require('../lib/datastore')
var Promise = require('bluebird')
var _ = require('lodash')
var builder = require('../lib/builder')

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
      res.render('repo', {
        repo: this.repo,
        commits: this.commits
      })
    })
    .catch(next)

})

router.use('/:id/builds', require('./builds'))

module.exports = router
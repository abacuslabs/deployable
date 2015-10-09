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

  next()

})

router.get('/:id', function(req, res, next) {

  var repoId = req.params.id

  ds.repos.findOneAsync({
    id: parseInt(repoId)
  })
  .bind({})
  .then(function(repo) {
    this.repo = repo

    var url = repo.full_name.split("/")
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

router.get('/:id/build/:sha', function(req, res, next) {

  ds.repos.findOneAsync({
    id: parseInt(req.params.id)
  })
  .bind({})
  .then(function(repo) {
    this.repo = repo
  })
  .then(function() {
    var url = this.repo.full_name.split("/")
    var user = url[0]
    var repo = url[1]

    return req.github.repos.getArchiveLinkAsync({
      user: user,
      repo: repo,
      ref: req.params.sha,
      archive_format: 'tarball'
    })
  })
  .then(function(link) {
    link = link.meta.location
    return builder.createBuild(this.repo.id, req.params.sha, link)
  })
  .then(function(build) {
    res.redirect('/repos/' + req.params.id)
  })
  .catch(next)

})

router.get('/:id/logs/:build_id', function(req, res, next) {

  builder.getLogs(req.params.build_id)
    .then(function(log) {
      res.render('log', {log: log})
    })
    .catch(next)

})

router.get('/:id/download/:build_id', function(req, res, next) {

  res.set('Content-Type', 'application/x-gtar');
  res.set('Content-Disposition', 'attachment; filename=' + req.params.build_id + '.tar.gz');
  builder.downloadBuild(req.params.build_id).pipe(res)

})

module.exports = router
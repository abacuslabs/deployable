var express = require('express')
var router = express.Router()
var ds = require('../lib/datastore')
var Promise = require('bluebird')
var _ = require('lodash')

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
    this.commits = _.map(commits, function(commit) {
      commit.short_sha = commit.sha.substr(0, 6)
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

module.exports = router
var express = require('express')
var router = express.Router()
var ds = require('../lib/datastore')
var builder = require('../lib/builder')
var Github = require('github')
var Promise = require('bluebird')

router.post('/github/:repo_id', function(req, res, next) {

  var sha = req.body.head_commit.id

  ds.repos.findOneAsync({
    id: parseInt(req.params.repo_id)
  })
  .bind({})
  .then(function(repo) {
    this.repo = repo

    var github = new Github({
      version: '3.0.0'
    })

    github.authenticate({
      type: 'oauth',
      token: repo.token
    })

    github.repos = Promise.promisifyAll(github.repos)

    var url = repo.full_name.split("/")
    var user = url[0]
    var repo = url[1]

    return github.repos.getArchiveLinkAsync({
      user: user,
      repo: repo,
      ref: sha,
      archive_format: 'tarball'
    })
  })
  .then(function(link) {
    link = link.meta.location
    return builder.createBuild(this.repo.id, sha, link)
  })
  .then(function() {
    res.sendStatus(200)
  })
  .catch(next)

})

module.exports = router
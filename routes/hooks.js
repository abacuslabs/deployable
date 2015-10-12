var express = require('express')
var router = express.Router()
var ds = require('../lib/datastore')
var builder = require('../lib/builder')
var Promise = require('bluebird')
var repoLib = require('../lib/repo')

router.post('/github/:repo_id', function(req, res, next) {

  var sha = req.body.head_commit.id

  repoLib.getRepoAndGithub(req.params.repo_id)
    .spread(function(repo, github) {
      this.repo = repo

      return github.repos.getArchiveLinkAsync({
        user: repo.user,
        repo: repo.name,
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
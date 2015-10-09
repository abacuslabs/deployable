var express = require('express')
var router = express.Router()
var ds = require('../lib/datastore')
var Promise = require('bluebird')
var _ = require('lodash')
var builder = require('../lib/builder')

router.get('/create/:sha', function(req, res, next) {

  Promise
    .resolve()
    .then(function() {
      var url = req.repo.full_name.split("/")
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
      return builder.createBuild(req.repo.id, req.params.sha, link)
    })
    .then(function(build) {
      res.redirect('/repos/' + req.repo.id)
    })
    .catch(next)

})

router.get('/:build_id/log', function(req, res, next) {

  builder.getLogs(req.params.build_id)
    .then(function(log) {
      res.render('log', {log: log})
    })
    .catch(next)

})

router.get('/:build_id/download', function(req, res, next) {

  res.set('Content-Type', 'application/x-gtar');
  res.set('Content-Disposition', 'attachment; filename=' + req.params.build_id + '.tar.gz');
  builder.downloadBuild(req.params.build_id).pipe(res)

})

module.exports = router

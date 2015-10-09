var express = require('express');
var router = express.Router();
var Github = require('github')
var Promise = require('bluebird')
var ds = require('../lib/datastore');
var reposConfig = require('../config/repos');
var _ = require('lodash');

router.use('/hooks', require('./hooks'))

// All endpoints from here on out require
// authentication with Github
router.use(function(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/github')
  }
  next()
})

// build a useable github library for the
// authenticated user session
router.use(function(req, res, next) {
  var github = new Github({
    version: '3.0.0'
  })

  github.authenticate({
    type: 'oauth',
    token: req.user.token
  })

  github.repos = Promise.promisifyAll(github.repos)

  req.github = github

  next()
})

/* GET home page. */
router.get('/', function(req, res, next) {

  var definedRepos = _.keys(reposConfig)

  ds.repos.findAsync({})
    .then(function(repos) {
      var dbRepos = _.pluck(repos, "full_name")

      // add in repo names that are not yet in
      // the datastore
      _.each(definedRepos, function(repo) {
        if (!_.contains(dbRepos, repo)) {
          repos.push({
            full_name: repo
          })
        }
      })

      // mark each repo enabled true/false if its
      // in the confg
      _.each(repos, function(repo) {
        repo.enabled = _.contains(definedRepos, repo.full_name)
      })

      // sort alphabetically
      repos = repos.sort(function(a, b) {
        return a.full_name.localeCompare(b.full_name)
      })

      res.render('index', {
        repos: repos
      })
    })
    .catch(next)

});

router.use('/repos', require('./repos'))

module.exports = router;
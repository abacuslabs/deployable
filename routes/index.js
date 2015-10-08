var express = require('express');
var router = express.Router();
var Github = require('github')
var Promise = require('bluebird')
var ds = require('../lib/datastore');

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

  ds.repos.findAsync({})
    .then(function(repos) {
      res.render('repos', {repos: repos})
    })
    .catch(next)

});

router.post('/', function(req, res, next) {

  var url = req.body.url.split('/')
  var user = url[0]
  var repo = url[1]

  // lets see if the user has access
  req.github.repos.getAsync({
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
  .then(function() {
    res.redirect('/')
  })
  .catch(next)

})

router.use('/repos', require('./repos'))
router.use('/stacks', require('./stacks'))

module.exports = router;
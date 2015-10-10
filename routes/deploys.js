var express = require('express')
var router = express.Router()
var ds = require('../lib/datastore')
var Promise = require('bluebird')
var deployer = require('../lib/deployer')

router.get('/:env/start', function(req, res, next) {

  deployer.startDeploy(req.repo.id, req.params.env)
    .then(function() {
      res.redirect('/repos/'+req.repo.id)
    })
    .catch(next)

})

module.exports = router
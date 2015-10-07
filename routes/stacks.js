var express = require('express')
var router = express.Router()
var stacksLib = require('../lib/stacks')

router.get('/', function(req, res, next) {

  stacksLib.getStacks()
    .then(function(stacks) {
      res.json(stacks)
    })
    .catch(next)

})

router.get('/:stack/build', function(req, res, next) {

  stacksLib.buildStack(req.params.stack)
    .then(function(buildId) {
      res.json({
        buildId: buildId
      })
    })
    .catch(next)

})

router.get('/logs/:build_id', function(req, res, next) {

  stacksLib.getLogs(req.params.build_id)
    .then(function(logData) {
      res.send(logData)
    })
    .catch(next)

})

module.exports = router
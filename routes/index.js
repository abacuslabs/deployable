var express = require('express');
var router = express.Router();

// All endpoints from here on out require
// authentication with Github
router.use(function(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/github')
  }
  next()
})

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.use('/stacks', require('./stacks'))

module.exports = router;

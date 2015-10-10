var ds = require('./datastore')
var _ = require('lodash')
var Promise = require('bluebird')

var getSignoffStatuses = module.exports.getSignoffStatuses = function(repoId, shas) {

  return ds.signoffs.findAsync({
    repo_id: repoId,
    sha: {
      $in: shas
    }
  })
  .then(function(signoffs) {
    signoffs = _.pluck(signoffs, "sha")

    var signoffMap = {}
    _.each(shas, function(sha) {
      signoffMap[sha] = _.contains(signoffs, sha)
    })

    return signoffMap
  })

}

var getSignoffInfo = module.exports.getSignoffInfo = function(repoId, commits) {

  return Promise
    .resolve()
    .bind({})
    .then(function() {
      return getSignoffStatuses(repoId, _.pluck(commits, "sha"))
    })
    .then(function(signoffShaMap) {
      this.signoffShaMap = signoffShaMap
    })
    .then(function() {
      this.canDeployProd = _.chain(this.signoffShaMap).values().every().value()
    })
    .then(function() {
      var commitsBySha = _.indexBy(commits, function(commit) {
        return commit.sha
      })

      var signoffShaMap = this.signoffShaMap
      var signoffUserMap = {}
      _.each(commits, function(commit) {
        var author = commit.commit.author.name
        if (commit.author) {
          author = commit.author.login
        }

        if (signoffUserMap[author] === undefined) {
          signoffUserMap[author] = true
        }

        if (!signoffShaMap[commit.sha]) {
          signoffUserMap[author] = false
        }
      })

      this.signoffUserMap = signoffUserMap
    })
    .then(function() {
      return [this.signoffShaMap, this.signoffUserMap, this.canDeployProd]
    })

}

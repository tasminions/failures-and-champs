const Bluebird = require('bluebird')
const jwtHelpers = require('../jwt.js')
const github = require('../github.js')

module.exports = {
  method: 'GET',
  path: '/leaderboard',
  handler: function(request, reply) {
    jwtHelpers.validate(request, function(err, userRecord) {
      if (err || !userRecord.auth) throw new Error(err)
      // TODO: check JWT expiry
      var users, userData
      // X 1. get all members of FAC7 github organisation
      github.getMembers('FAC7', userRecord.auth, function(err, response) {
        // console.log(response);
        if (response instanceof String) throw new Error(response)
        // X 2. for each user, build user object with link to profile picture, etc
        if (! (response instanceof Array) ) {
          reply('406 Bad Request: ' + response)
          return console.log("QUOTA EXCEEDED:", response)
        }

        users = response.reduce((accum, user) => {
          accum[user.login] = {
            name: user.login,
            img_url: user.avatar_url,
            profile_url: user.html_url,
            contrib_total: 0
          }
          return accum
        }, {})
        var reposObj = {}

        var repoPromises = Object.keys(users).map( user => {
          return github.getUniqueRepos(user, reposObj, userRecord.auth)
        })

        Bluebird.all(repoPromises).then(function(repoResults) {
          var flattenedRepos = [].concat.apply([], repoResults).reduce((accum, repoObj) => {
            accum[repoObj.id] = repoObj
            return accum
          }, {})

          uniqueRepos = Object.keys(flattenedRepos).map(repoId => {
            return flattenedRepos[repoId]
          })

          var contribPromises = uniqueRepos.map(repo => {
            return github.getContributors(repo, userRecord.auth)
          })

          Bluebird.all(contribPromises).then(function(contribResults) {
            var flattenedContribs = [].concat.apply([], contribResults)
            flattenedContribs.forEach(contributor => {
              if (contributor.author && users.hasOwnProperty(contributor.author.login)) {
                users[contributor.author.login].contrib_total += contributor.total
              }
            })

            // 6. rank users by one of the statistics
            userData = Object.keys( users ).map( user => users[user] )
                                           .sort((a, b) => {return b.contrib_total - a.contrib_total})

            //function that selects winner user and removes it frp, user data
            var winner = userData.reduce(function(prev, curr){
              if (prev.contrib_total > curr.contrib_total) {
                return prev ;
              } else {
                return curr;
              }
            });

            //function that selects loser ''
            var loser = userData.reduce(function(prev, curr){
              if (prev.contrib_total < curr.contrib_total) {
                return prev ;
              } else {
                return curr;
              }
            });
            reply.view('leaderboard', {users: userData, winner: winner, loser: loser})

          })
        })
      })
    })
  }
}

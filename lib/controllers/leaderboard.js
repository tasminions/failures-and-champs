const Bluebird = require('bluebird')
const jwtHelpers = require('../jwt.js')
const github = require('../github.js')
const utils = require('../utils.js')

module.exports = {
  method: 'GET',
  path: '/leaderboard',
  handler: function(request, reply) {
    jwtHelpers.validate(request, function(err, userRecord) {
      if (err || !userRecord.auth) throw new Error(err)
      // TODO: check JWT expiry
      var users, userData

      // get all members of FAC7 github organisation
      github.getMembers('FAC7', userRecord.auth, function(err, response) {
        if (! (response instanceof Array) ) {
          reply('406 Bad Request: ' + response)
          return console.log("QUOTA EXCEEDED:", response)
        }

        // for each user, build user object with link to profile picture, etc
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

        // Map user objects to array of promises
        // // "getUniqueRepos" returns a promise which resolves with an array of
        // // repository objects (returned from github API)
        var repoPromises = Object.keys(users).map( user => {
          return github.getUniqueRepos(user, reposObj, userRecord.auth)
        })


        Bluebird.all(repoPromises).then(function(repoResults) {
          // After all repository promises have resolved filter out dupes again
          var flattenedRepos = [].concat.apply([], repoResults).reduce((accum, repoObj) => {
            accum[repoObj.id] = repoObj
            return accum
          }, {})

          // Map the object to an array of (unique) repo objects
          uniqueRepos = Object.keys(flattenedRepos).map(repoId => {
            return flattenedRepos[repoId]
          })

          // Map repo objects to array of promises
          // // "getContributors" returns a promise which resolves with an array
          // // of contributor objects (returned from github API)
          var contribPromises = uniqueRepos.map(repo => {
            return github.getContributors(repo, userRecord.auth)
          })

          Bluebird.all(contribPromises).then(function(contribResults) {
            // After all contributor promises have resolved:
            // // if the contributor is in the FAC7 org, get the current weeks contributions
            // // and add them to the user object
            utils.flattenArray(contribResults).forEach(contributor => {
              if (contributor.author && users.hasOwnProperty(contributor.author.login)) {
                var contribCurrentWeek = contributor.weeks.filter(week => week.w === utils.getStartOfWeek())[0]
                users[contributor.author.login].contrib_total += contribCurrentWeek.c // commits
              }
            })

            // rank users by one of the statistics
            userData = Object.keys( users )
                              .map( user => users[user] )
                              .sort((a, b) => {return b.contrib_total - a.contrib_total})

            var winner = userData[0]
            var loser = userData[userData.length - 1]

            reply.view('leaderboard', {users: userData, winner: winner, loser: loser})
          })
        })
      })
    })
  }
}

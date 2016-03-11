const jwtHelpers = require('../jwt.js')

module.exports = {
  method: 'GET',
  path:   '/',
  handler: function(request, reply){
    jwtHelpers.validate(request, function(error, userRecord) {
      if (err || !userRecord.auth) {
        return reply.view('home')
      } else {
        return reply.redirect('/leaderboard')
      }
    })
  }
}

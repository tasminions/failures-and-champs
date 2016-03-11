const utils = require('../utils.js')
const jwtHelpers = require('../jwt.js')
const querystring = require('querystring')

module.exports = {
  method: 'GET',
  path: '/auth',
  handler: function(request, reply) {
    var body = querystring.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      code: request.query.code,
      client_secret: process.env.GITHUB_CLIENT_SECRET
    })
    utils.makeRequest('post', 'https://github.com/login/oauth/access_token', body, "", function(err, response){
      if (err) throw err;
      var token = response.access_token;
      if(!token) {
        reply('you belong to the failures of failuresandchamps')
      }
      else {
        jwtHelpers.authSuccess(request, token, function(jwt){
          reply.redirect('/leaderboard').state("jwt", jwt)
        })
      }
    })
  }
}

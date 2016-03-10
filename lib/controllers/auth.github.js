const utils = require('../utils.js')

module.exports = {
  method: 'GET',
  path: '/githublogin',
  handler: function( request, reply){
    reply.redirect( utils.createGithubAuthRoute() )
  }
}

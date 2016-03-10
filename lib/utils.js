//requiring node modules
var request     = require('request');
var querystring = require('querystring');

module.exports = {
  makeRequest: function makeRequest(method, url, body, token, callback){
    var reqOptions = {
      url: url,
      headers: {
        'User-Agent':'failuresandchamps',
        'Accept'    : 'application/json',
        'Authorization': 'token '+token
      },
      body: body || ''
    };
    request[ method.toLowerCase() ]( reqOptions, function( err, message, response){
      if( err ) { throw err }
      try {
        response = JSON.parse(response)
      } catch (e) {
        console.log(e, response)
      }
      callback( err, response )
    });
  },
  createGithubAuthRoute: function(){
    return 'https://github.com/login/oauth/authorize?'+
      querystring.stringify({
        client_id:    process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.BASE_URL+'/auth',
        scope:        'admin:org'
      });
  }
}

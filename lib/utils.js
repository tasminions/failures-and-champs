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
  },

  // Gets the UNIX timestamp for the beginning of the current week,
  // defined as midnight on Sunday to agree with githubs api convention
  getStartOfWeek: function() {
    var now = new Date()
    var diff = now.getDate() - now.getDay()
    var newDate = new Date(now.setDate(diff))
    newDate.setHours(0, 0, 0, 0)
    return newDate / 1000
  },

  flattenArray: function(arr) {
    return [].concat.apply([], arr)
  },

  removeImpostors: function(impostors, usersObj){
    impostors.forEach( impostor => {
      if( usersObj[impostor] ){
        delete usersObj[impostor]
      }
    })
  }
}

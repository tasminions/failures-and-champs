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
      callback( response )
    });
  }
}

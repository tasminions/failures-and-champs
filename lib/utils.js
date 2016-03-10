//requiring node modules
var request     = require('request');
var querystring = require('querystring');

module.exports = {
  makeRequest: function makeRequest(method, url, body, callback){
    var reqOptions = {
      url: url,
      headers: {
        'User-Agent':'failuresandchamps',
        'Accept'    : 'application/json'
      },
      body: body || ''
    };
    request[ method.toLowerCase() ]( reqOptions, function( err, message, response){
      if( err ) { throw err }
      response = JSON.parse(response);
      callback( response );
    });
  }
}

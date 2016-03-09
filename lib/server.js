require('env2')('./config.env');
var https   = require('https');
var Hapi    = require('hapi');
var server  = new Hapi.Server();
var Path    = require('path');
var Inert   = require('inert');
var querystring = require('querystring');

server.connection(
  {
    port: process.env.PORT || 4000
  }
);

var plugins = [
  Inert
];

// request function
const makeRequest = function(options, callback){
  var request = https.request(options, function(response){
    var body = '';
    response.on('data',function(chunk){
      body+=chunk;
    });
    response.on('end',function(){
      callback( null, body );              // no error (null)
    });
  });
  request.on('error', function(err){
    console.log('request to ' + options.hostname + ' has failed!');
    callback(err);
  });
  request.end(options.body);
};

const createGitHubAuthRoute = function(){
  return 'https://github.com/login/oauth/authorize?'+
    querystring.stringify({
      client_id:    process.env.FACEBOOK_APP_ID,
      redirect_uri: process.env.BASE_URL+'/welcome'
    });
};

server.register( plugins, function(err){
  if(err){
    console.log(err);
    throw err;
  }
  server.route([
    {
      method: 'GET',
      path:   '/',
      handler: function(request, reply){
        reply.file( Path.join(__dirname + '/../public/index.html') );
      }
    },
    {
      method: 'GET',
      path: '/flogin',
      handler: function( request, reply){
        reply.redirect( createFacebookAuthRoute() );
      }
    },
    {
      method: 'GET',
      path: '/welcome',
      handler: function( request, reply){
              console.log("... request.query.code",  request.query.code);
        makeRequest({
          hostname: "facebook.com",
          path: "/dialog/oauth/access_token",
          method: "POST",
          headers: {
            Accept: "application/json"
          },
          body: querystring.stringify({
            client_id: process.env.FACEBOOK_APP_ID,
            code: request.query.code,
            client_secret: process.env.FACEBOOK_APP_SECRET
          })
        }, function(err, response){
          if (err) throw err;
          var token = JSON.parse(response).access_token;
           console.log(token);
        });
      }
    },
    {
    method: 'GET',
    path: '/auth',
    handler: function( request, reply){
      console.log( request.query.code );
      reply('hi');
    }
  },
  {
  method: 'GET',
  path: '/logout',
  handler: function( request, reply){
    console.log( request.query.code );
    reply('hi');
  }
}
  ]);
});

server.start(function(err){
  if( err ){
    console.log(err);
    throw error;
  }
  console.log('server started on ',server.info.uri);
});

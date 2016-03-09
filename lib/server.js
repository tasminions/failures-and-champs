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

const createGithubAuthRoute = function(){
  return 'https://github.com/login/oauth/authorize?'+
    querystring.stringify({
      client_id:    process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.BASE_URL+'/leaderboard'
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
      path: '/githublogin',
      handler: function( request, reply){
        reply.redirect( createGithubAuthRoute() );
      }
    },
    {
      path: '/getdata',
      method: 'GET',
      handler: function(req, reply){
        var token = req.state.access_token;
        var options = {
          hostname: 'api.github.com',
          path: '/user',
          method: 'GET',
          body: "",
          headers: {
            "Authorization": 'token ' + token,
            "User-Agent": "oauth_walkthrough"
            // "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36"
          }
        };
        makeRequest(options, function(err, response){
          if (err) throw err;
          console.log(JSON.parse(response));
          reply(response);
        });

      }
    },
    {
      method: 'GET',
      path: '/leaderboard',
      handler: function( request, reply){
        console.log("... request.query.code",  request.query.code);
        makeRequest({
        hostname: 'github.com',
        path: '/login/oauth/access_token',
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: querystring.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          code: request.query.code,
          client_secret: process.env.GITHUB_CLIENT_SECRET
          })
        }, function(err, response){
            if (err) throw err;
            var token = JSON.parse(response).access_token;
            console.log(token);
            // server.state("access_token");
            reply.file('./public/index.html').state("access_token", token);
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
 }]);
});

server.start(function(err){
  if( err ){
    console.log(err);
    throw error;
  }
  console.log('server started on ',server.info.uri);
});

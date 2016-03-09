require('env2')('./config.env');
var https   = require('https');
var Hapi    = require('hapi');
var server  = new Hapi.Server();
var Path    = require('path');
var Inert   = require('inert');
var Vision  = require('vision');
var Handlebars = require('handlebars');
var querystring = require('querystring');


server.connection(
  {
    port: process.env.PORT || 4000
  }
);

var plugins = [
  Inert,
  Vision
];

// request function
const makeRequest = function( options, callback ) {
  var request = https.request(options, function(response){
    var body = '';
    response.on('data',function(chunk){
      body+=chunk;
    });
    response.on('end',function(){
      callback( null, body );              // no error (null)
    })
  });
  request.on('error', function(err){
    console.log('request to ' + options.host + ' has failed!');
    callback(err);
  });
  request.end(options.body);
};

const createFacebookAuthRoute = function(){
  return 'https://facebook.com/dialog/oauth?'+
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

  server.views({
    engines: {html: Handlebars},
    relativeTo: __dirname + '/../',
    path:       './views',
    layoutPath: './views/layout',
    layout: 'default',
    partialsPath: './views/partials/'
  });

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
        console.log( request.query.code );
        reply.redirect('/dashboard');
      }
    },

  ]);
});

server.start(function(err){
  if( err ){
    console.log(err);
    throw error;
  }
  console.log('server started on ',server.info.uri);
});

module.exports = server;

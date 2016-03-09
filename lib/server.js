require('env2')('./config.env');
var https   = require('https');
var Hapi    = require('hapi');
var server  = new Hapi.Server();
var Path    = require('path');
var Inert   = require('inert');
var Vision  = require('vision');
var Handlebars = require('handlebars');
var querystring = require('querystring');
var github = require('./github.js');

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
    },{
      method: 'GET',
      path: '/leaderboard',
      handler: function(request, reply) {
        var users
        // X 1. get all members of FAC7 github organisation
        github.getMembers('FAC7', function(response) {

          // X 2. for each user, build user object with link to profile picture, etc
          users = response.map(user => {
            return {
              name: user.login,
              img_url: user.avatar_url,
              profile_url: user.html_url
            }
          })

          // 3. for each user, get list of events and filter for unique repos
          users.forEach(user => {
            github.getUniqueRepos(user, function(repos) {
              // 4. for each repo, get list of contributors & stats
              repos.forEach(repo => {
                github.getContributors(repo, function(contributors) {
                  // 5. aggregate all users contributions into the users object
                  if (users.hasOwnProperty('contrib_total')) {
                    users.contrib_total += contributors.total
                  } else {
                    users.contrib_total = contributors.total
                  }

                  // 6. rank users by one of the statistics
                  users.sort(function(a, b) {
                    return b.contrib_total - a.contrib_total
                  })

                  // 7. pass array of user objects to the template
                  reply.view('leaderboard', {users: users})
                })
              })
            })
          })
        })
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

module.exports = server;

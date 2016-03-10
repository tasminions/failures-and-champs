// requiring node modules
require('env2')('./config.env');
var https       = require('https');
var Hapi        = require('hapi');
var server      = new Hapi.Server();
var Path        = require('path');
var Inert       = require('inert');
var Vision      = require('vision');
var Handlebars  = require('handlebars');
var querystring = require('querystring');
var Twitter = require('twitter');
var fs = require('fs');
var Bluebird    = require("bluebird");
// requiring local modules
var github      = require('./github.js');
var jwtHelpers  = require("./jwt.js");
var utils       = require('./utils');


var twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});


server.connection(
  {
    port: process.env.PORT || 4000,
    host: 'localhost',
  }
);

var plugins = [
  Inert,
  Vision
];

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
     path: '/{param*}',
     handler: function(request, reply) {
       reply.file(__dirname + '/../' + request.url.path)
     }
   },
    //home page
    {
      method: 'GET',
      path:   '/',
      handler: function(request, reply){
        reply.view( "home");
      }
    },
    // send request to github to authenticate the clients login
    {
      method: 'GET',
      path: '/githublogin',
      handler: function( request, reply){
        reply.redirect( utils.createGithubAuthRoute() );
      }
    },

    {
      method: 'GET',
      path: '/auth',
      handler: function( request, reply){
        var body = querystring.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          code: request.query.code,
          client_secret: process.env.GITHUB_CLIENT_SECRET
        })
        utils.makeRequest('post','https://github.com/login/oauth/access_token', body, "", function(err, response){
          if (err) throw err;
          var token = response.access_token;
          if(!token) {
            reply('you belong to the failures of failuresandchamps');
          }
          else {
            jwtHelpers.authSuccess(request, token, function(jwt){
              reply.redirect('/leaderboard').state("jwt", jwt);
            });
          }
        });
      }
    },
//    {
//       method: 'GET',
//       path: '/logout',
//       handler: function( request, reply){
//         console.log( request.query.code );
//         reply.redirect('/dashboard');
//       }
//     },
    {
      method: 'GET',
      path: '/leaderboard',
      handler: function(request, reply) {
        jwtHelpers.validate(request, function(err, userRecord) {
          if (err || !userRecord.auth) throw new Error(err)
          // TODO: check JWT expiry
          var users, userData
          // X 1. get all members of FAC7 github organisation
          github.getMembers('FAC7', userRecord.auth, function(err, response) {
            // console.log(response);
            if (response instanceof String) throw new Error(response)
            // X 2. for each user, build user object with link to profile picture, etc
            if (! (response instanceof Array) ) {
              reply('406 Bad Request: ' + response)
              return console.log("QUOTA EXCEEDED:", response)
            }

            users = response.reduce((accum, user) => {
              accum[user.login] = {
                name: user.login,
                img_url: user.avatar_url,
                profile_url: user.html_url,
                contrib_total: 0
              }
              return accum
            }, {})
            var reposObj = {}

            var repoPromises = Object.keys(users).map( user => {
              return github.getUniqueRepos(user, reposObj, userRecord.auth)
            })

            Bluebird.all(repoPromises).then(function(repoResults) {
              var flattenedRepos = [].concat.apply([], repoResults).reduce((accum, repoObj) => {
                accum[repoObj.id] = repoObj
                return accum
              }, {})

              uniqueRepos = Object.keys(flattenedRepos).map(repoId => {
                return flattenedRepos[repoId]
              })

              var contribPromises = uniqueRepos.map(repo => {
                return github.getContributors(repo, userRecord.auth)
              })

              Bluebird.all(contribPromises).then(function(contribResults) {
                var flattenedContribs = [].concat.apply([], contribResults)
                flattenedContribs.forEach(contributor => {
                  if (contributor.author && users.hasOwnProperty(contributor.author.login)) {
                    users[contributor.author.login].contrib_total += contributor.total
                  }
                })

                // 6. rank users by one of the statistics
                userData = Object.keys( users ).map( user => users[user] )
                                               .sort((a, b) => {return b.contrib_total - a.contrib_total})

                //function that selects winner user and removes it frp, user data
                var winner = userData.reduce(function(prev, curr){
                  if (prev.contrib_total > curr.contrib_total) {
                    return prev ;
                  } else {
                    return curr;
                  }
                });

                //function that selects loser ''
                var loser = userData.reduce(function(prev, curr){
                  if (prev.contrib_total < curr.contrib_total) {
                    return prev ;
                  } else {
                    return curr;
                  }
                });
                reply.view('leaderboard', {users: userData, winner: winner, loser: loser})

              })
            })
          })
        })
      }
    },
    {
      method: 'GET',
      path: '/tweetloser',
      handler: function(request, reply) {
        var data = fs.readFileSync(__dirname+'/img/loser.jpg');
        twitterClient.post('media/upload', {'media': data}, function(err, media){
          if (!err) {
            var status = {
              status: "you are this week's loser",
              media_ids: media.media_id_string
            }
            twitterClient.post('statuses/update', status, function(err, tweet, response){
              if (err) throw err;

              reply(tweet);
            })
          }

        })

      }
    },
    {
      method: 'GET',
      path: '/tweetwinner',
      handler: function(request, reply) {
        var data = fs.readFileSync(__dirname+'/img/firstplace.jpg');
        twitterClient.post('media/upload', {'media': data}, function(err, media){
          if (!err) {
            var status = {
              status: "you are this week's winner",
              media_ids: media.media_id_string
            }
            twitterClient.post('statuses/update', status, function(err, tweet, response){

              if (err) throw err;

              reply(tweet);
            })
          }

        })

      }
    }])
});

server.start(function(err){
  if( err ){
    console.log(err);
    throw error;
  }
  console.log('server started on ',server.info.uri);
});

module.exports = server;

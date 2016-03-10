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
var Bluebird    = require("bluebird");

// requiring local modules
var github      = require('./github.js');
var jwtHelpers  = require("./jwt.js");
var utils       = require('./utils');


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
    //home page
    {
      method: 'GET',
      path:   '/',
      handler: function(request, reply){
        reply.file( Path.join(__dirname + '/../public/index.html') );
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
    // {
    //   path: '/getdata',
    //   method: 'GET',
    //   handler: function(req, reply){
    //     var token = req.state.access_token;
    //     var options = {
    //       hostname: 'api.github.com',
    //       path: '/user',
    //       method: 'GET',
    //       body: "",
    //       headers: {
    //         "Authorization": 'token ' + token,
    //         "User-Agent": "oauth_walkthrough"
    //         // "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36"
    //       }
    //     };
    //     makeRequest(options, function(err, response){
    //       if (err) throw err;
    //       console.log(JSON.parse(response));
    //       reply(response);
    //     });
    //
    //   }
    // },

    // github sends the user here
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
            // var temp = users
            // users = {}
            // users.franzmoro = temp.franzmoro
            var reposObj = {}
            var eliasContribs = 0;

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

                reply.view('leaderboard', {users: userData})
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

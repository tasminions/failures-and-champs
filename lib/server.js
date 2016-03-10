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

// // request function
// const makeRequest = function(options, callback){
//   var request = https.request(options, function(response){
//     var body = '';
//     response.on('data',function(chunk){
//       body+=chunk;
//     });
//     response.on('end',function(){
//       callback( null, body );              // no error (null)
//     });
//   });
//   request.on('error', function(err){
//     console.log('request to ' + options.hostname + ' has failed!');
//     callback(err);
//   });
//   request.end(options.body);
// };

const createGithubAuthRoute = function(){
  return 'https://github.com/login/oauth/authorize?'+
    querystring.stringify({
      client_id:    process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.BASE_URL+'/auth',
      scope:        'admin:org'
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
        reply.redirect( createGithubAuthRoute() );
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
        utils.makeRequest('post','https://github.com/login/oauth/access_token', body, "", function(response){
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
          github.getMembers('FAC7', userRecord.auth, function(response) {
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
                profile_url: user.html_url
              }
              return accum
            }, {})
            // var temp = users
            // users = {}
            // users.franzmoro = temp.franzmoro
            var reposObj = {}
            // 3. for each user, get list of events and filter for unique repos
            Object.keys(users).forEach((user, idxUser, arrUser) => {
              github.getUniqueRepos(user, reposObj, userRecord.auth, function(repos) {
                // 4. for each repo, get list of contributors & stats
                repos.forEach((repo, idxRepo, arrRepo) => {
                  github.getContributors(repo, userRecord.auth, function(contributors) {
                    // 5. aggregate all users contributions into the users object
                    if (contributors instanceof Array) {
                      contributors.forEach(contributor => {
                        if (users.hasOwnProperty(contributor.author.login)) {
                          if (users[contributor.author.login].hasOwnProperty('contrib_total')) {
                            users[contributor.author.login].contrib_total += contributor.total
                          } else {
                            users[contributor.author.login].contrib_total = contributor.total
                          }
                        }
                      })
                      // 6. rank users by one of the statistics
                      userData = Object.keys( users ).map( user => users[user] )
                      // .sort((a, b) => {return b.contrib_total - a.contrib_total})
                    }

                    if (idxUser === arrUser.length - 1 && idxRepo === arrRepo.length - 1) {
                      console.log("USERDATA", userData);
                      console.log({users});
                      //function that selects winner user and removes it frp, user data
                      var winner = userData.reduce(function(prev, curr){
                        if (prev.contrib_total > curr.contrib_total) {
                          return prev ;
                        } else {
                          return curr;
                        }
                      });

                      var loser = userData.reduce(function(prev, curr){
                        if (prev.contrib_total < curr.contrib_total) {
                          return prev ;
                        } else {
                          return curr;
                        }
                      });
                      //function that selects loser ''
                      reply.view('leaderboard', {users: users, winner: winner, loser: loser})
                    }
                  })
                })
              })
            })
            // 7. pass array of user objects to the template
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

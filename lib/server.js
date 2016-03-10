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

var twitterParams = {screen_name: 'FailuresNChamps'};

server.connection(
  {
    port: process.env.PORT || 4000
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
      redirect_uri: process.env.BASE_URL+'/auth'
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
        console.log("... request.query.code",  request.query.code);
        var body = querystring.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          code: request.query.code,
          client_secret: process.env.GITHUB_CLIENT_SECRET
        })
        utils.makeRequest('post','https://github.com/login/oauth/access_token', body, function(response){
          console.log('response with access_token--->',response);
          if (err) throw err;
          var token = response.access_token;
          console.log('access_token--->',token);
          if(!token) {
            reply('you belong to the failures of failuresandchamps');
          }
          else {
            console.log(jwtHelpers);
            jwtHelpers.authSuccess(request, token, function(jwt){
              console.log(jwt);
              reply.redirect('/leaderboard').state("access_token", jwt);
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
        var users
        // X 1. get all members of FAC7 github organisation
        github.getMembers('FAC7', function(response) {
          if (response instanceof String) throw new Error(response)
          // X 2. for each user, build user object with link to profile picture, etc
          users = response.reduce((accum, user) => {
            accum[user.login] = {
              name: user.login,
              img_url: user.avatar_url,
              profile_url: user.html_url
            }
            return accum
          }, {})

          console.log("users <<<< ", users);
          var reposObj = {}
          // 3. for each user, get list of events and filter for unique repos
          Object.keys(users).forEach(user => {
            console.log(user);
            github.getUniqueRepos(user, reposObj, function(repos) {
              // 4. for each repo, get list of contributors & stats
              console.log("repos >>>>", repos);
              repos.forEach(repo => {
                github.getContributors(repo, function(contributors) {
                  console.log("contributors >>>>", contributors);
                  // 5. aggregate all users contributions into the users object
                  contributors.forEach(contributor => {
                    if (users[contributor.author.login].hasOwnProperty('contrib_total')) {
                      users[contributor.author.login].contrib_total += contributor.total
                    } else {
                      users[contributor.author.login].contrib_total = contributor.total
                    }
                  })

                  console.log("users >>>>", users);

                  // 6. rank users by one of the statistics
                  users = Object.keys( users ).map( user => users[user] )
                                      .sort(function(a, b) {
                                        return b.contrib_total - a.contrib_total
                                      });
                  console.log("sorted users >>>>", users);

                  // 7. pass array of user objects to the template
                  reply.view('leaderboard', {users: users})
                })
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
        console.log('youre in tweet');
        twitterClient.post('media/upload', {'media': data}, function(err, media){
          if (!err) {
            console.log(media);
            var status = {
              status: "you are this week's loser",
              media_ids: media.media_id_string
            }
            twitterClient.post('statuses/update', status, function(err, tweet, response){
              console.log("youre in twitter callback");
              console.log("tweet",tweet);
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
        console.log('youre in tweet');
        twitterClient.post('media/upload', {'media': data}, function(err, media){
          if (!err) {
            console.log(media);
            var status = {
              status: "you are this week's winner",
              media_ids: media.media_id_string
            }
            twitterClient.post('statuses/update', status, function(err, tweet, response){
              console.log("youre in twitter callback");
              console.log("tweet",tweet);
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

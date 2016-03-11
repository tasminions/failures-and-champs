require('env2')('./config.env')
const Hapi       = require('hapi')
const Handlebars = require('handlebars')
const schedule   = require('node-schedule')
const server     = new Hapi.Server()

const twitter    = require('./twitter.js')

server.connection({port: process.env.PORT || 4000})

var plugins = [
  'inert',
  'vision'
].map(plugin => require(plugin))

server.register( plugins, function(err){
  if (err) throw err

  server.views({
    engines: {html: Handlebars},
    relativeTo: __dirname + '/../',
    path: './views',
    layoutPath: './views/layout',
    layout: 'default',
    partialsPath: './views/partials/'
  })

  var routes = [
    './controllers/home.js',
    './controllers/resources.js',
    './controllers/auth.github.js',
    './controllers/auth.main.js',
    './controllers/auth.logout.js',
    './controllers/leaderboard.js'
  ].map(path => require(path))
  routes = Array.prototype.concat.apply([], routes)

  server.route(routes)
})

server.start(function(err){
  if (err) throw error
  console.log('server started on ', server.info.uri)
})

// Tweet the winner and loser every friday at 4:30pm
schedule.scheduleJob('30 16 * * 5', function() {
  console.log("Scheduled job is running...");
  twitter.tweetWinnerAndLoser()
})

module.exports = server

require('env2')('./config.env')
const Hapi       = require('hapi')
const Handlebars = require('handlebars')
const server     = new Hapi.Server()


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
    './controllers/leaderboard.js',
    './controllers/twitter.js'
  ].map(path => require(path))
  routes = Array.prototype.concat.apply([], routes)

  server.route(routes)
})

server.start(function(err){
  if (err) throw error
  console.log('server started on ', server.info.uri)
})

module.exports = server

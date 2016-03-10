module.exports = {
 method: 'GET',
 path: '/{param*}',
 handler: function(request, reply) {
   reply.file(__dirname + '/../' + request.url.path)
 }
}

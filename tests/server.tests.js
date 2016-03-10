var test = require('wrapping-tape');
var server = require('./../lib/server.js');

test = test({
  start: function(t){

  },
  teardown: function(t){
    t.end();
    server.stop();
  }
});

test('server is defined', function(t){
  t.ok( Object.keys(server).length > 0, 'server object exists and is not empty');
  t.end();
});

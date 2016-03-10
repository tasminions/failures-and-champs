var redis = require("redis");
var client = redis.createClient();

function put(accessToken, record, callback){
  client.HMSET(accessToken, "valid", record.valid, "created", record.created, callback);
}

function get(key, callback) {
  client.HGETALL(key, callback)
}

module.exports={
  put: put,
  get: get
};

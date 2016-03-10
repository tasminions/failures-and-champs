var redis = require("redis");
var client = redis.createClient();

function put(accessToken, record, callback){
  client.HMSET(accessToken, "valid", record.valid, "created", record.created, callback);
}


module.exports={
  put: put
};

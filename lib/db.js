const client = require("redis").createClient(process.env.REDIS_URL)

module.exports = {
  put: function(accessToken, record, callback) {
    client.HMSET(accessToken, "valid", record.valid, "created", record.created, callback);
  },

  get: function(key, callback) {
    client.HGETALL(key, callback)
  }
};

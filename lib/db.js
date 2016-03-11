const client = require("redis").createClient(process.env.REDIS_URL)

module.exports = {
  putRecord: function(accessToken, record, callback) {
    client.HMSET(accessToken, "valid", record.valid, "created", record.created, callback)
  },

  get: function(key, callback) {
    client.HGETALL(key, callback)
  },

  putWinnerLoser: function(winner, loser, callback) {
    client.HMSET('winnerloser', 'winner', winner, 'loser', loser, callback)
  },

  getWinnerLoser: function(callback) {
    client.HGETALL('winnerloser', function(err, records) {
      callback(err, records)
    })
  }
};

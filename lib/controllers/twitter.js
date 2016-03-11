const Twitter = require('twitter')
const fs = require('fs')

const twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

module.exports = {
  method: 'GET',
  path: '/tweet/{place}',
  handler: function(request, reply) {
    if (['winner', 'loser'].indexOf(request.params.place) > -1) {
      var image = fs.readFileSync(__dirname + '/../../public/img/' + request.params.place + '.jpg');
      twitterClient.post('media/upload', {'media': image}, function(err, media){
        if (!err) {
          var status = {
            status: "you are this week's " + request.params.place,
            media_ids: media.media_id_string
          }
          twitterClient.post('statuses/update', status, function(err, tweet, response){
            if (err) throw err;
            reply(tweet);
          })
        }
      })
    }
  }
}

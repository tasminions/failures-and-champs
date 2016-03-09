var request = require('request');

function makeRequest(path, callback){
  var reqOptions = {
    url: 'https://api.github.com/'+path,
    headers: { 'User-Agent':'failuresandchamps' }
  };
  request.get( reqOptions, function( err, message, response){
    if( err ) { throw err }
    response = JSON.parse(response);
    callback( response );
  });
}

module.exports = {
  getMembers: function( organization, cb ){
    var path = 'orgs/'+organization+'/members'
    makeRequest(path, cb);
  },

  getUniqueRepos: function( user, reposObj, cb ){
    var path = 'users/'+user+'/events'
    makeRequest( path, function(response){
      console.log(path, response);
      cb(
        Object.keys(
        response.map( eventObj =>  ( {id: eventObj.repo.id, name: eventObj.repo.name } ))
                .reduce( (accum, a) => {
                  accum[a.id]=a.name;
                  return accum;
                }, reposObj )
        )
      );
    });
  },

  getContributors: function(repo, cb) {
    var path = '/repositories/'+repo.id+'/stats/contributors'
    makeRequest(path, cb)
  }
};

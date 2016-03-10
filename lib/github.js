var request = require('request');
var utils   = require('./utils.js');


module.exports = {
  getMembers: function( organization, token, cb ){
    var url = 'https://api.github.com/orgs/'+organization+'/members'
    utils.makeRequest('get', url, '', token, cb);
  },

  getUniqueRepos: function( user, reposObj, token, cb ){
    var url = 'https://api.github.com/users/'+user+'/events'
    utils.makeRequest( 'get', url, '', token, function(response){
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

  getContributors: function(repo, token, cb) {
    var url = 'https://api.github.com/repositories/'+repo+'/stats/contributors'
    utils.makeRequest('get',url, '', token, cb)
  }
};

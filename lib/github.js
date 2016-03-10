var request = require('request');
var utils   = require('./utils.js');


module.exports = {
  getMembers: function( organization, cb ){
    var url = 'https://api.github.com/orgs/'+organization+'/members'
    utils.makeRequest('get',url, '', cb);
  },

  getUniqueRepos: function( user, reposObj, cb ){
    var url = 'https://api.github.com/users/'+user+'/events'
    utils.makeRequest( 'get', url, '', function(response){
      console.log(url, response);
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
    var url = 'https://api.github.com/repositories/'+repo.id+'/stats/contributors'
    utils.makeRequest('get',url, '', cb)
  }
};

var request = require('request');
var utils   = require('./utils.js');
var Bluebird    = require("bluebird");

function getMembers ( organization, token, cb ){
  var url = 'https://api.github.com/orgs/'+organization+'/members'
  utils.makeRequest('get', url, '', token, cb);
}

function getUniqueRepos ( user, reposObj, token, cb ){
  var url = 'https://api.github.com/users/'+user+'/events'
  utils.makeRequest( 'get', url, '', token, function(response){
    var reposObjofObjs = response.reduce( (accum, a) => {
      accum[a.repo.id] = {id: a.repo.id, name: a.repo.name }
      return accum;
    }, reposObj );
    // console.log( Object.keys( reposObjofObjs ).map( repoId => reposObjofObjs[repoId] ) );
    cb( Object.keys( reposObjofObjs ).map( repoId => reposObjofObjs[repoId] ) );
  });
}

module.exports = {
  getMembers: Bluebird.promisify( getMembers ),

  getUniqueRepos: Bluebird.promisify( getUniqueRepos ),

  getContributors: function(repo, token, cb) {
    var url = 'https://api.github.com/repositories/'+repo.id+'/stats/contributors'
    utils.makeRequest('get',url, '', token, cb)
  }
};

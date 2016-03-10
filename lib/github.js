var request = require('request');
var utils   = require('./utils.js');
var Bluebird    = require("bluebird");

function getMembers ( organization, token, cb ){
  var url = 'https://api.github.com/orgs/'+organization+'/members'
  utils.makeRequest('get', url, '', token, cb);
}

function getUniqueRepos ( user, reposObj, token, cb ){
  var url = 'https://api.github.com/users/'+user+'/events'
  utils.makeRequest( 'get', url, '', token, function(err, response){
    var reposObjofObjs = response.reduce( (accum, a) => {
      accum[a.repo.id] = {id: a.repo.id, name: a.repo.name }
      return accum;
    }, reposObj );
    cb( null, Object.keys( reposObjofObjs ).map( repoId => reposObjofObjs[repoId] ) );
  });
}

function getContributors(repo, token, cb) {
  var url = 'https://api.github.com/repositories/'+repo.id+'/stats/contributors'
  utils.makeRequest('get',url, '', token, cb)
}

module.exports = {
  getMembers: getMembers,

  getUniqueRepos: Bluebird.promisify( getUniqueRepos ),

  getContributors: Bluebird.promisify( getContributors )
};

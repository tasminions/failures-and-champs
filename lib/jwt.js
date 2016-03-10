var jwt = require('jsonwebtoken');
var querystring = require("querystring");
var db = require('./db.js');

// function authHandler(request, response){
//   if (request.method === 'POST') {
//     var body = "";
//     request.on('data', function(data){
//       var post = querystring.parse(body);
//       if (post.username && post.username === user.username && post.password &&
//         post.password === user.password) {
//           return authSuccess(request, response);
//       } else {
//         return authFail(response);
//       }
//     });
//   }
// }

function authSuccess(request, accessToken, cb ){
  var token = generateAndStoreJWT(request, accessToken);
  cb( token );
}




function generateAndStoreJWT(request, accessToken){
  var token = generateToken(request, accessToken);
  var record = {
    "valid": true,
    "created": new Date().getTime()
  };

  db.put(accessToken, record, function(err){
    console.log("record saved ", record);
  });

  return token;
}

//generate the jwt
function generateToken(req, accessToken){
  var expireDefault = Math.floor(new Date().getTime()/1000) + 7*24*60*60;
  var token = jwt.sign({
    auth: 'magic',
    agent: req.headers['user-agent'],
    exp: expireDefault,   // Note: in seconds!
  }, process.env.JWT_SECRET);  // secret is defined in the environment variable JWT_SECRET
  return token;
}

// used when the user sends a request with JWT so that we can validate that its the right user in the right session
function validate(request, response){
  var token = request.headers.Authorization;
  var decoded = verify(token);
  if (!decoded || !decoded.auth) {
    authFail(response);
    return callback(response);
  } else {
    db.get(decoded.auth, function(err, record){
      var rec;
      try {
        rec = JSON.parse(record);
      } catch (e) {
        rec = {
          valid: false
        };
      }
      if (err || !rec.valid) {
        authFail(response);
        return callback(res);
      } else {
        privado(response, token);
        return callback(response);
      }
    });
  }
}
function privado(res, token){
  res.writeHead(200, {
    "content-type": "text/html",
    "authorization": token
  });
  return res.end(restricted);
}
function verify(token) {
  var decoded = false;
  try {
    decoded = jwt.verify(token, secret);
  } catch (e) {
    decoded = false;
  }
  return decoded;
}

module.exports = {
  authSuccess: authSuccess
};

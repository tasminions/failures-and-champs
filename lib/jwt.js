var jwt = require('jsonwebtoken');
var secret = process.env.JWT_SECRET;


function authHandler(request, response){
  if (request.method === 'POST') {
    var body = "";
    request.on('data', function(data){
      var post = qs.parse(body);
      if (post.username && post.username === user.username && post.password &&
        post.password === user.password) {
          return authSuccess(request, response);
      } else {
        return authFail(response);
      }
    });
  }
}

function authSuccess(request, response){
  var token = generateAndStoreToken(request);
  res.writeHead(200, {
    "content-type": 'text/html',
    "authorization": token
  });
  return response.end(restricted);
}

//generate the jwt
function generateToken(req, GUID, options){
  options = options || {};
  var expiresDefault = Math.floor(new Date().getTime()/1000) + 7*24*60*60;

  var token = jwt.sign({
    auth: 'magic',
    agent: req.headers['user-agent'],
    exp: options.expires || expireDefault,   // Note: in seconds!
  }, secret);  // secret is defined in the environment variable JWT_SECRET
  return token;
}

//GUID - globally unique identifier
function generateAndStoreToken(request, options){
  var GUID = generateGUID();
  var token = generateToken(request, GUID, options);
  var record = {
    "valid": true,
    "created": new Date().getTime()
  };

  db.put(GUID, JSON.stringify(record), function(err){
    console.log("record saved ", record);
  });

  return token;
}

function validate(request, response){
  var token = request.headers.authorization;
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

function verify(token) {
  var decoded = false;
  try {
    decoded = jwt.verify(token, secret);
  } catch (e) {
    decoded = false;
  }
  return decoded;
}

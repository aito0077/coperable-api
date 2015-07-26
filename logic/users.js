var usuario = require('../models/usuario.js'),
    config = require('../config'),
    request = require('request'),
    us = require('underscore'),
    jwt = require('jwt-simple'),
    qs = require('querystring'),
    moment = require('moment');

function createJWT(user) {
  var payload = {
    sub: user._id,
    name: user.username,
    email: user.email,
    iat: moment().unix(),
    exp: moment().add(14, 'days').unix()
  };
  return jwt.encode(payload, config.server.TOKEN_SECRET);
}



exports.list = function(req, res, next) {
    usuario.list(
        function(data) {
            res.send(data);
        },
        function(err) {
            res.send(err);
        }
    );
};

exports.listOwners = function(req, res, next) {
    usuario.listOwners(
        function(data) {
            res.send(data);
        },
        function(err) {
            res.send(err);
        }
    );
};



exports.create = function(req, res, next) {
    var body = req.body;
    console.log("[users.js create] Creating new user: ");
    console.dir(body);
    body['picture'] = body.profile_picture;
    usuario.alreadyExists(body.username, function(results) {
        console.log("[users.js create] Inserting new user;")
        usuario.insert(
            body,
            function(data) {
                res.send(data);
            },
            function(err) {
                res.send(err);
            }
        );
     },
     function(message) {
        res.send(message);
    } );

};

exports.authenticate = function(req, res, next) {
    var body = req.body;
    var login_data = {
        password: body.password,
        username: body.username
    };
    //console.dir(login_data);
    usuario.findOne({ username: login_data.username}, function(err, user) {
        if (err) {
            console.log('Error: '+err);
            throw err;
        }
        if(user) {
            if(user['feca'] != true) {
                console.log("No Feca ");
                user.comparePassword(login_data.password, function(err, isMatch) {
                    if (err) { 
                console.log('error de password');
                        throw err;
                    }
                    res.send(isMatch ? user : {});
                });
            } else {
                console.log("Feca Password: "+login_data.password+" - user: "+user.password);
                res.send((login_data.password == user.password) ? user : {});
            }
        } else {
            res.send({});
        }
    });
};


exports.findById = function(req, res, next) {
    var user_id = req.params.id;
    console.log("Find by Id: " + user_id);
    usuario.Model.findById(user_id, '-password').exec(function (err, user) {
        if(user) {
            res.send(user);
        } else {
            res.send(404, 'usuario_password_erroneo');
        }
    });
};

exports.update = function(req, res, next) {
    var user_id = req.params.id;
    usuario.Model.findById(user_id, '-password').exec(function (err, user) {
        if(user) {
            res.send(user);
        } else {
            res.send(404, 'usuario_password_erroneo');
        }
    });
};

exports.save = function(req, res, next) {
    var user_id = req.params.id;
    console.log('[usuarios::save] Guardando usuario: ' + user_id);
    var body = req.body;

    body['picture'] = body.profile_picture;
    usuario.Model.findById(user_id, function (err, user) {
        if (err) return handleError(err);
        us.extend(user, body);
        user.save(function (err) {
            if (err) return handleError(err);
            res.send(user);
        });
    });
};


exports.findByProvider = function(req, res, next) {
    var provider = req.params.provider;
        user_id = req.params.id,
        user_filter = {};
    user_filter[provider+'_id'] = user_id;
    //console.dir(user_filter);
    usuario.Model.findOne(user_filter,  '-password').exec(function (err, user) {
        console.dir(user);
        if(user) {
            res.send(user);
        } else {
            res.send({});
        }
    });
};



//JWT
exports.login = function(req, res, next) {
    usuario.Model.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
            return res.send(401, { message: 'Email o password incorrectos' });
        }
        user.comparePassword(req.body.password, function(err, isMatch) {
            if (!isMatch) {
                return res.send(401, { message: 'Email o password incorrectos.' });
            }
            res.send({ token: createJWT(user) });
        });
    });
};

exports.signup = function(req, res, next) {
    usuario.Model.findOne({ email: req.body.email }, function(err, existingUser) {
        if (existingUser) {
            return res.send(409, { message: 'El email ya existe' });
        }
        var user = new usuario.Model({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password
        });
        user.save(function() {
            res.send({ token: createJWT(user) });
        });
    });
};

exports.auth_facebook = function(req, res, next) {
  var accessTokenUrl = 'https://graph.facebook.com/v2.3/oauth/access_token';
  var graphApiUrl = 'https://graph.facebook.com/v2.3/me';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.server.FACEBOOK_SECRET,
    redirect_uri: req.body.redirectUri
  };

  // Step 1. Exchange authorization code for access token.
  request.get({ url: accessTokenUrl, qs: params, json: true }, function(err, response, accessToken) {
    if (response.statusCode !== 200) {
      return res.send(500, { message: accessToken.error.message });
    }

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: graphApiUrl, qs: accessToken, json: true }, function(err, response, profile) {
      if (response.statusCode !== 200) {
        return res.send(500, { message: profile.error.message });
      }
      if (req.headers.authorization) {
        usuario.Model.findOne({ facebook_id: profile.id }, function(err, existingUser) {
          if (existingUser) {
            return res.send(409, { message: 'There is already a Facebook account that belongs to you' });
          }
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, config.server.TOKEN_SECRET);
          usuario.Model.findById(payload.sub, function(err, user) {
            if (!user) {
              return res.send(400, { message: 'User not found' });
            }
            user.facebook_id = profile.id;
            user.username = user.username || profile.name;
            user.save(function() {
              var token = createJWT(user);
              res.send({ token: token });
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        usuario.Model.findOne({ facebook_id: profile.id }, function(err, existingUser) {
          if (existingUser) {
            var token = createJWT(existingUser);
            return res.send({ token: token });
          }
          var user = new usuario.Model();
          user.facebook_id = profile.id;
          user.username = profile.name;
          user.save(function() {
            var token = createJWT(user);
            res.send({ token: token });
          });
        });
      }
    });
  });
};

exports.auth_twitter = function(req, res, next) {
  var requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
  var accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
  var profileUrl = 'https://api.twitter.com/1.1/users/show.json?screen_name=';


  // Part 1 of 2: Initial request from Satellizer.
  if (!req.body.oauth_token || !req.body.oauth_verifier) {
    var requestTokenOauth = {
      consumer_key: config.server.TWITTER_KEY,
      consumer_secret: config.server.TWITTER_SECRET,
      callback: req.body.redirectUri
    };

    // Step 1. Obtain request token for the authorization popup.
    request.post({ url: requestTokenUrl, oauth: requestTokenOauth }, function(err, response, body) {
      var oauthToken = qs.parse(body);

      // Step 2. Send OAuth token back to open the authorization screen.
      res.send(oauthToken);
    });
  } else {
    // Part 2 of 2: Second request after Authorize app is clicked.
    var accessTokenOauth = {
      consumer_key: config.server.TWITTER_KEY,
      consumer_secret: config.server.TWITTER_SECRET,
      token: req.body.oauth_token,
      verifier: req.body.oauth_verifier
    };

    // Step 3. Exchange oauth token and oauth verifier for access token.
    request.post({ url: accessTokenUrl, oauth: accessTokenOauth }, function(err, response, accessToken) {

      accessToken = qs.parse(accessToken);

      var profileOauth = {
        consumer_key: config.server.TWITTER_KEY,
        consumer_secret: config.server.TWITTER_SECRET,
        oauth_token: accessToken.oauth_token
      };

      // Step 4. Retrieve profile information about the current user.
      request.get({
        url: profileUrl + accessToken.screen_name,
        oauth: profileOauth,
        json: true
      }, function(err, response, profile) {

        // Step 5a. Link user accounts.
        if (req.headers.authorization) {
          usuario.Model.findOne({ twitter_id: profile.id }, function(err, existingUser) {
            if (existingUser) {
              return res.send(409, { message: 'There is already a Twitter account that belongs to you' });
            }

            var token = req.headers.authorization.split(' ')[1];
            var payload = jwt.decode(token, config.server.TOKEN_SECRET);

            usuario.Model.findById(payload.sub, function(err, user) {
              if (!user) {
                return res.send(400, { message: 'User not found' });
              }

              user.twitter_id = profile.id;
              user.username = user.username || profile.name;
              user.save(function(err) {
                res.send({ token: createJWT(user) });
              });
            });
          });
        } else {
          // Step 5b. Create a new user account or return an existing one.
          usuario.Model.findOne({ twitter: profile.id }, function(err, existingUser) {
            if (existingUser) {
              return res.send({ token: createJWT(existingUser) });
            }

            var user = new usuario.Model();
            user.twitter_id = profile.id;
            user.username = profile.name;
            user.save(function() {
              res.send({ token: createJWT(user) });
            });
          });
        }
      });
    });
  }
};

exports.me = function(req, res, next) {
    usuario.Model.findById(req.user, '-password').exec(function (err, user) {
        res.send(user);
    });
};



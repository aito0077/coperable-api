var mongoose = require('mongoose/'),
    restify = require('restify'),
    config = require('./config'),
    iniciativas = require('./logic/iniciativas.js'),
    search = require('./logic/search.js'),
    comunidades = require('./logic/comunidades.js'),
    jwt = require('jwt-simple'),
    moment = require('moment'),
    usuarios = require('./logic/users.js');

if( process.env.VCAP_SERVICES ){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    var mongo = env['mongodb-1.8'][0]['credentials'];
} else {
    var mongo = {
        "hostname":"127.0.0.1",
        "port":27017,
        "username":"",
        "password":"",
        "name":"",
        "db":"test"
    };
}

var generate_mongo_url = function(obj) {
    obj.hostname = (obj.hostname || '127.0.0.1');
    obj.port = (obj.port || 27017);
    obj.db = (obj.db || 'test');

    if(obj.username && obj.password) {
        return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
    } else {
        return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
}

var mongourl = generate_mongo_url(mongo);

mongoose.connect(mongourl);

var server = restify.createServer({
    name: 'Coperable API'
});
server.use(restify.bodyParser({ mapParams: false }));

server.use(restify.CORS());
server.use(restify.fullResponse());
server.use(restify.queryParser());
server.use(
  function crossOrigin(req,res,next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    return next();
  }
);

server.get('/api/iniciativa', iniciativas.list);
server.get('/api/iniciativa/user/:user_id', iniciativas.browseByUser);
server.get('/api/iniciativa/last/:lat/:lng', iniciativas.findLast);
server.get('/api/iniciativa/category/:category', iniciativas.browseByCategory);
server.get('/api/iniciativa/s_name/:name', iniciativas.findByName);
server.post('/api/iniciativa/search', iniciativas.findByQuery);
server.get('/api/iniciativa/aggregations', iniciativas.aggregations);
server.get('/api/iniciativa/search', iniciativas.search);
server.get('/api/iniciativa/search-term', iniciativas.search_by_term);
server.get('/api/iniciativa/:id', iniciativas.findById);
server.get('/api/iniciativa/withOwnerAndMembers/:number_of_members/:id', iniciativas.findByIdWithOwnerAndMembers);

server.post('/api/iniciativa', iniciativas.create);
server.post('/api/iniciativa/:id', iniciativas.save);
server.del('/api/iniciativa/:id', iniciativas.remove);
server.post('/api/iniciativa/:id/:userId', iniciativas.participate);
server.post('/api/iniciativa/:id/:userId/quit', iniciativas.quitIniciativa);

server.get('/api/comunidades', comunidades.list);
server.get('/api/comunidades/:id', comunidades.findById);
server.post('/api/comunidades/:id', comunidades.save);
server.post('/api/comunidades', comunidades.create);
server.del('/api/comunidades/:id', comunidades.remove);

server.post('/api/tags', iniciativas.getTags);

server.get('/api/organizadores', usuarios.listOwners);
server.get('/api/participantes', usuarios.list);

server.get('/api/user', usuarios.list);
server.post('/api/user/authenticate', usuarios.authenticate);
server.get('/api/user/:id', usuarios.findById);
server.post('/api/user/:id', usuarios.save);
server.get('/api/user/oauth/:provider/:id', usuarios.findByProvider);

server.post('/api/usuario/:id', usuarios.save);
server.post('/api/usuario', usuarios.create);
server.get('/api/es/synchronize_iniciativas', search.synchronize_iniciativas);
server.get('/api/es/synchronize_usuarios', search.synchronize_usuarios);
server.get('/api/es/delete_indices', search.delete_indices);

server.get('/api/auth/login', usuarios.login);
server.post('/api/auth/login', usuarios.login);
server.get('/api/auth/signup', usuarios.signup);
server.post('/api/auth/signup', usuarios.signup);
server.post('/api/auth/facebook', usuarios.auth_facebook);
server.post('/api/auth/twitter', usuarios.auth_twitter);

function ensureAuthenticated(req, res, next) {
    if (!req.headers.authorization) {
        return res.send(401, { message: 'Please make sure your request has an Authorization header' });
    }
    var token = req.headers.authorization.split(' ')[1];

    var payload = null;
    try {
        payload = jwt.decode(token, config.server.TOKEN_SECRET);
    } catch (err) {
        return res.send(401, { message: err.message });
    }

    if (payload.exp <= moment().unix()) {
        return res.send(401, { message: 'Expiro sesion' });
    }
    req.user = payload.sub;
    next();
}

server.get('/api/auth/me', ensureAuthenticated, usuarios.me);

server.listen(config.server.port, config.server.host, function() {
      console.log('%s listening at %s', server.name, server.url);
});

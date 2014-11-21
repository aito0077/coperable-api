var mongoose = require('mongoose/'),
    config = require('./config'),
    iniciativas = require('./logic/iniciativas.js'),
    iniciativaModel = require('./models/iniciativa.js').Model,
    usuarioModel = require('./models/usuario.js').Model,
    _ = require('underscore'),
    ObjectId = mongoose.Types.ObjectId
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

usuarioModel.find().select('_id username iniciativas ownedIniciativas').exec(function (error, result) {
    if (error) {
        console.error(error);
    } else {
        _.each(result, function(usuario) {
            var iniciativas_array  = usuario.iniciativas;
            console.log("USUARIO: "+usuario.username);
            console.dir(iniciativas_array);
            _.each(iniciativas_array, function(iniciativa) {
                

                iniciativaModel.findById(iniciativa.id, function (err, iniciativa_object) {
                    console.log(err);
                    if(iniciativa_object) {
                        console.log("iniciativa: "+iniciativa.id+" existe");
                    } else {
                        console.log("iniciativa: "+iniciativa.id+" NO extiste");
                        usuarioModel.update({_id: usuario._id}, { 
                            $pull: { 
                                'iniciativas': {_id: iniciativa._id } 
                            } 
                        }, {}, function(errr, userrr) {
                            if(errr) {
                               console.log(errr);
                            } else {
                                console.log("Iniciativa: "+iniciativa.id+" removida de usuario: "+usuario.username);

                            }
                        });
                    }
                });

            });
                
            var owned_iniciativas = usuario.ownedIniciativas;
            console.log("USUARIO: "+usuario.username);
            console.dir(owned_iniciativas);
            _.each(owned_iniciativas, function(iniciativaO) {
                

                iniciativaModel.findById(iniciativaO.id, function (err, iniciativa_object) {
                    console.log(err);
                    if(iniciativa_object) {
                        console.log("iniciativa: "+iniciativaO.id+" existe");
                    } else {
                        console.log("iniciativa: "+iniciativaO.id+" NO extiste");
                        usuarioModel.update({_id: usuario._id}, { 
                            $pull: { 
                                'ownedIniciativas': {_id: iniciativaO._id } 
                            } 
                        }, {}, function(errr, userrr) {
                            if(errr) {
                               console.log(errr);
                            } else {
                                console.log("Iniciativa: "+iniciativaO.id+" removida de usuario: "+usuario.username);

                            }
                        });
                    }
                });

            });
 
        });
    }
});

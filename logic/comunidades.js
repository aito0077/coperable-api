var Comunidad = require('../models/comunidad.js'),
    Usuario = require('../models/usuario.js'),
    Iniciativa = require('../models/iniciativa.js'),
    async = require('async'),
    _ = require('underscore');

exports.list = function(req, res, next) {
    Comunidad.list(
        function(data) {
            res.send(data);
        },
        function(err) {
            res.send(err);
        }
    );
};

exports.create = function(req, res, next) {
    console.log("[previous create]:");
    var body = req.body;
    console.log("[comunidad.js create] Creating new Comunidad:");
    Comunidad.insert(
        body,
        function(data) {
            res.send(data);
        },
        function(err) {
            res.send({error: err});
        }
    );
};

exports.save = function(req, res, next) {
    var comunidad_id = req.params.id;
    console.log('[comunidades::save] Guardando comunidad: ' + comunidad_id);
    var body = req.body;
    Comunidad.Model.findById(comunidad_id, function (err, comunidad) {
        if (err) return handleError(err);
        _.extend(comunidad, body);
        comunidad.save(function (err) {
            if (err) return handleError(err);
            res.send(comunidad);
        });
    });
};

exports.findById = function(req, res, next) {
    var comunidad_id = req.params.id;
    console.log('Comunidad id: '+ comunidad_id);
    Comunidad.Model.findById(comunidad_id).exec(function(err, result) {
        if (err) {
          console.error(err);
        }
        if(result) {
            var usuarios_id_array = _.pluck(result.members, 'user'),
                iniciativas_id_array = result.iniciativas;

            console.dir(usuarios_id_array);
            console.dir(iniciativas_id_array);

            async.parallel({
                miembros: function(callback){
                    Usuario.Model.find({
                        '_id': { 
                            $in: usuarios_id_array
                        }
                    }).select('_id username first_name last_name email about picture').exec(function(err, docs){
                        callback(err, docs);
                    });

                },
                iniciativas: function(callback){
                    Iniciativa.Model.find({
                        '_id': { 
                            $in: iniciativas_id_array 
                        }
                    }, function(err, docs){
                        callback(err, docs);
                    });
                }
            },
            function(err, results) {
                var total_result = _.extend({
                    comunidad: result
                }, results);
                console.dir(total_result);

                res.send(total_result);
            });

        } else {
            res.send(404, {});
        }
    });
};

exports.findByQuery = function(req, res, next) {
    var query= req.body;
    console.log("Find by query");
    Comunidad.Model.find(query).sort('start_date').exec(function(err, result) {
        console.dir(result);
        console.log(err);
        if(result) {
            res.send(result);
        } else {
            res.send(404, {});
        }
    });
};

exports.add_iniciativa_to_comunidades = function(iniciativa) {

    console.log("add iniciativas to comunidades");
    console.dir(iniciativa.comunidades);
    console.log(typeof(iniciativa.comunidades));
        
    _.each(iniciativa.comunidades, function(comunidad) {

        exports.add_iniciativa_to_comunidad(iniciativa, comunidad);

    });

};

exports.add_iniciativa_to_comunidad = function(iniciativa, comunidad) {
    console.log('add_iniciativa_to_comunidad');
    Comunidad.Model.findById(comunidad._id, function (errr, comunidad_persist) {
        if (errr) {
             console.log(errr);
             return handleError(errr);
        }
        var owner_id = iniciativa.owner,
            iniciativa_id = iniciativa._id;
        console.log("Inicaitiva id: "+iniciativa_id+" owner: "+owner_id);
        console.dir(comunidad_persist);
        comunidad_persist.update(
            { 
                $addToSet: { 'iniciativas':  iniciativa_id , 'members': owner_id},
                $inc: { 'iniciativas_amount': 1 }
            },
            function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log('Add iniciativa: '+iniciativa._id+' to comunidad: '+comunidad_persist._id);
                }
            } 
        );
    });
};
/*
        Comunidad.Model.update(
            {
                _id: comunidad_persist._id
            },
            { 
                $addToSet: { 'iniciativas':  iniciativa_id , 'members': ownser_id},
                $inc: { 'iniciativas_amount': 1 }
            },
            function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log('Add iniciativa: '+iniciativa._id+' to comunidad: '+comunidad_persist._id);
                }
            } 
        );

*/

exports.remove_iniciativa_from_comunidad = function(iniciativa, comunidad) {
    Comunidad.Model.findById(comunidad._id, function (err, comunidad_persist) {
        if (err) return handleError(err);
        var owner_id = iniciativa.owner,
            iniciativa_id = iniciativa._id;
        comunidad_persist.update(
            { 
                $pull: { iniciativas:  iniciativa_id },
                $inc: { iniciativas_amount: -1 }
            },
            function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log('Remove iniciativa: '+iniciativa._id+' from comunidad: '+comunidad_persist._id);
                }
            } 
        );
    });
};




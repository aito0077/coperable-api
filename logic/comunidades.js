var Comunidad = require('../models/comunidad.js'),
    Usuario = require('../models/usuario.js'),
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
            res.send(result);
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


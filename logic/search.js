var es = require('elasticsearch'),
    Iniciativa = require('../models/iniciativa.js'),
    Usuario = require('../models/usuario.js'),
    _ = require('underscore');
 
exports.bulk_insert = function(req, res, next) {
    var client = new es.Client({
        host: 'localhost:9200'
    });
    model.Model.find().exec(function(errr, data) {
            if(errr) {
                console.log(errr);
                next(errr);
                return;
            }
            var bulk_request = new Array();
            _.each(data, function(iniciativa) {
                var to_index = {
                    id: iniciativa._id, 
                    name: iniciativa.name,
                    description: iniciativa.description,
                    address: iniciativa.address,
                    main_category: iniciativa.main_category,
                    topics: iniciativa.topics,
                    owner: iniciativa.owner,
                    coords: {
                        "lat": iniciativa.location.latitude,
                        "lon": iniciativa.location.longitude
                    },
                    start_date: iniciativa.start_date,
                    end_date: iniciativa.end_date,
                    creation_date: iniciativa.creation_date
                };
         
                bulk_request.push({index: {_index: 'iniciativas', _type: 'iniciativa', _id: iniciativa._id}});
                bulk_request.push(to_index);
            });

            var callback = function(err, resp) {
                if (err) { 
                    console.log(err); 
                    next(err);
                }
                console.log("Finished");
                next("finished");
            };
 
            console.log("Size to bulk: "+bulk_request.length);
            client.bulk({
                body: bulk_request
            }, callback);


        });

};

exports.synchronize_iniciativas = function(req, res, next) {

    var stream = Iniciativa.Model.synchronize(),
        count = 0;

    stream.on('data', function(err, doc){
        count++;
    });
    stream.on('close', function(){
        console.log({message: 'indexed ' + count + ' documents!'});
        next('indexed ' + count + ' documents!');
    });
    stream.on('error', function(err){
        console.log(err);
        next(err);
    });

};

exports.synchronize_usuarios = function(req, res, next) {

    var stream = Usuario.Model.synchronize(),
        count = 0;

    stream.on('data', function(err, doc){
        count++;
    });
    stream.on('close', function(){
        console.log({message: 'indexed ' + count + ' documents!'});
        next('indexed ' + count + ' documents!');
    });
    stream.on('error', function(err){
        console.log(err);
        next(err);
    });

};

exports.delete_indices = function(req, res, next) {
    var client = new es.Client({
        host: 'localhost:9200'
    });
    var callback = function(err, resp) {
        if (err) { 
            console.log(err); 
            next(err);
        }
        console.log("Deleted All Indices");
        next("finished");
    };
 
    client.indices.delete({
        index: '*' 
    }, callback);
};

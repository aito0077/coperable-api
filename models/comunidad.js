var mongoose = require('mongoose/'),
    util = require('util'),
    us = require('underscore'),
    async = require("async"),
    Schema = mongoose.Schema,
    Usuario = require('../models/usuario.js');


var ComunidadSchema = new Schema({
    name:  String,
    slug:  String,
    description:   String,
    country:   String,
    profile_picture:   String,
    main_category: String,
    moderators: [{
        user: String,
        since_date: { type: Date, default: Date.now }
    }],
    members: [],
    participants: [{
        user: String,
        since_date: { type: Date, default: Date.now }
    }],
    iniciativas: [], 
    iniciativas_amount: {type: Number, default: 0},
    topics: [String],
    public: { type: Boolean, default: false},
    networks: {
        twitter: String,
        facebook: String,
        youtube: String,
        flickr: String,
        linkedin: String,
        delicious: String,
        vimeo: String
    },
    creation_date: { type: Date, default: Date.now },
    modification_date: { type: Date, default: Date.now }
});

var Comunidad = mongoose.model('Comunidad', ComunidadSchema);

exports.Model = Comunidad;

var limit = 20;

exports.list = function(success) {
  //Comunidad.find().where('profile_picture').exists(true).sort('-start_date').limit(limit).exec(function (err, data) {
  Comunidad.find().sort('-start_date').limit(limit).exec(function (err, data) {
    success(data);
  });
};

exports.get = function(id, success) {
  Comunidad.findOne({code: id}).exec(success);
};

exports.insert = function(comunidad, success, error) {
    var default_values = {
        creation_date: new Date(),
        modification_date: new Date()
    },
    persist = {};
    us.extend(persist, comunidad, default_values);

    var comunidad_model = new Comunidad(persist);
    comunidad_model.save(function(err, data) {
        if(err) {
            console.log(err);
            error(err);
        } else {
            console.log('exito en crear comunidad: '+data._id);
            success(data);
        }
    });
};

exports.update = function(comunidad, success, error) {
    Comunidad.update({code: comunidad.code}, comunidad, function(err) {
        if(err) {
           error(err);
        } else {
           success();
        }
    });
};


exports.remove = function(id, success, error) {

    Comunidad.remove({code: id}, function(err) {
        if(err) {
            error(err);
        } else {
            success();
        }
    });
};




var mongoose = require('mongoose'),
    mongoosastic = require('mongoosastic'),
    util = require('util'),
    us = require('underscore'),
    async = require("async"),
    Schema = mongoose.Schema,
    Usuario = require('../models/usuario.js');


var IniciativaSchema = new Schema({
    name:  String,
    slug:  String,
    code:  String,
    goal:  String,
    duration:  String,
    description:   String,
    address:   String,
    profile_picture:   String,
    participants_amount:   String,
    phone:   String,
    email:   String,
    entrada:   String,
    comments:   String,
    contact:   String,
    organization:   String,
    country:   String,
    city:   String,
    main_category: String,
    categories: {
        medio_ambiente: {type: Boolean, default: false},
        educacion: {type: Boolean, default: false},
        desarrollo: {type: Boolean, default: false},
        arte_cultura: {type: Boolean, default: false},
        bienestar: {type: Boolean, default: false},
        deporte: {type: Boolean, default: false}
    },
    owner: {
        user: String,
        name: String
    },
    comunidades: [{
        _id: String,
        name: String,
        since: { type: Date, default: Date.now }
    }],

    /**
     * Participantes de la iniciativa.
     */
    members: [{
        /**
         * Id del usuario.
         */
        user: String,
        since_date: { type: Date, default: Date.now }
    }],
    tasks: [{
        tag: String,
        description: String
    }],
    topics: [String],
    public: { type: Boolean, default: false},
    feca: { type: Boolean, default: false},
    minka: { type: Boolean, default: false},
    implementation: {type: String, default: ''},
    stages: [{
        stage: String,
        description: String,
        start_date: { type: Date, default: Date.now, es_type:'date'},
        finish_date: { type: Date, default: Date.now, es_type:'date'}
    }],
    current_stage: String,
    version: Number,
    location: {
        latitude: {type: Number, default: 0},
        longitude: {type: Number, default: 0}
    },
    /**
     * Campo duplicado de location. está duplicado xq se usa para ser indexado cómo '2d'.
     */
    coords: [Number, Number],
    networks: {
        twitter: String,
        facebook: String,
        youtube: String,
        flickr: String,
        linkedin: String,
        delicious: String,
        vimeo: String
    },
    date: { type: Date, default: Date.now, es_type:'date' },
    start_date: { type: Date, default: Date.now, es_type:'date' },
    end_date: { type: Date, default: Date.now, es_type:'date' },
    creation_date: { type: Date, default: Date.now, es_type:'date' },
    modification_date: { type: Date, default: Date.now, es_type:'date' }
});

IniciativaSchema.virtual('convocatoria').get(function () {
  return this.current_stage == 'PREPARACION';
});

IniciativaSchema.virtual('activando').get(function () {
  return this.current_stage == 'ACTIVO';
});

IniciativaSchema.virtual('finalizada').get(function () {
  return this.current_stage == 'FINALIZADO';
});

IniciativaSchema.index ({
       coords : "2d"
});

IniciativaSchema.plugin(mongoosastic, {
	hosts: [
		'http://104.236.192.8:8080'
	]
});

var Iniciativa = mongoose.model('Iniciativa', IniciativaSchema);

exports.Model = Iniciativa;

var limit = 60;

exports.list = function(success) {
  Iniciativa.find().where('profile_picture').exists(true).sort('-start_date').limit(limit).exec(function (err, data) {
    success(data);
  });
};

exports.participate = function(iniciativa, userId, callback) {
    Iniciativa.update(
        {
            _id: iniciativa._id,
            'members.user': {
                $ne: userId
            }
        },
        {
            $push: {
                'members': {
                    user: userId
                }
            }
        },
        {},
        function updatingIniciativa(errIniciativa, numIniciativaAffected) {
            if (errIniciativa) {
                console.error("[updatingIniciativa] Error participando a usuario [" + userId + "] de iniciativa [" + iniciativa._id + "]:");
                console.dir(errIniciativa);
                callback(errIniciativa);
                return;
            }
            console.log("[iniciativa::participate] Number of iniciativas updated: " + numIniciativaAffected);
            if (numIniciativaAffected > 0) {
                Usuario.Model.update(
                    {
                        _id: userId
                    },
                    {
                        $push: {
                            'iniciativas': {
                                id: iniciativa._id,
                                name: iniciativa.name,
                                description: iniciativa.description,
                                profile_picture: iniciativa.profile_picture
                            }
                        }
                    },
                    {},
                    function updatingUsuario(errUsuario, numUsuarioAffected) {
                        console.log("[iniciativa::participate] Number of usuarios updated: " + numUsuarioAffected);
                        if (errUsuario) {
                            console.error("[updatingUsuario] Error participando a usuario [" + userId + "] de iniciativa [" + iniciativa._id + "]:");
                            console.dir(errUsuario);
                            callback(errUsuario);
                            return;
                        }
                        callback(null, {
                            numIniciativaAffected: numIniciativaAffected,
                            numUsuarioAffected: numUsuarioAffected
                        });
                    }
                );
            } else {
                callback(null, {
                    numIniciativaAffected: 0,
                    numUsuarioAffected: 0
                });
            }
        }
    );
};

exports.quitIniciativa = function(iniciativa, userId, callback) {
    Iniciativa.update(
        {
            _id: iniciativa._id,
            'members.user': userId
        },
        {
            $pull: {
                'members': {
                    user: userId
                }
            }
        },
        {},
        function updatingIniciativa(errIniciativa, numIniciativaAffected) {
            if (errIniciativa) {
                console.error("[updatingIniciativa] Error removiendo a usuario [" + userId + "] de iniciativa [" + iniciativa._id + "]:");
                console.dir(errIniciativa);
                callback(errIniciativa);
                return;
            }
            if (numIniciativaAffected > 0) {
                Usuario.Model.update(
                    {
                        _id: userId
                    },
                    {
                        $pull: {
                            'iniciativas': {
                                id: iniciativa._id
                            }
                        }
                    }, {},
                    function updatingUsuario(errUsuario, numUsuarioAffected) {
                        if (errUsuario) {
                            console.error("[updatingUsuario] Error removiendo a usuario [" + userId + "] de iniciativa [" + iniciativa._id + "]:");
                            console.dir(errUsuario);
                            callback(errUsuario);
                            return;
                        }
                        callback(null, {
                            numIniciativaAffected: numIniciativaAffected,
                            numUsuarioAffected: numUsuarioAffected
                        });
                    }
                );
            } else {
                callback(null, {
                    numIniciativaAffected: 0,
                    numUsuarioAffected: 0
                });
            }
        }
    );
};



exports.get = function(id, success) {
  Iniciativa.findOne({code: id}).exec(success);
};

exports.insert = function(iniciativa, success, error) {
    var default_values = {
        creation_date: new Date(),
        modification_date: new Date(),
        coords: [iniciativa.location.longitude || 0, iniciativa.location.latitude || 0],
        categories: {
            medio_ambiente: false,
            educacion: false,
            desarrollo: false,
            arte_cultura: false
        },
        location: {
            latitude: iniciativa.location.latitude,
            longitude: iniciativa.location.longitude
        },
        current_stage: 'PREPARACION',
        feca: false,
        stages: [{
            stage: 'PREPARACION',
            description: 'PREPARACION',
            start_date: new Date(),
        }]
    },
    persist = {};
    us.extend(persist, default_values, iniciativa, {coords: [default_values.location.longitude || 0, default_values.location.latitude || 0]});

    persist.main_category = us.first(us.filter(us.keys(persist.categories), function(categ) {
        return persist.categories[categ];
    }));
    coords = [];
    coords[0] = default_values.location.longitude || 0;
    coords[1] = default_values.location.latitude || 0;
    persist.coords = coords;
    var iniciativa_model = new Iniciativa(persist);
    iniciativa_model.save(function(err, data) {
        if(err) {
            console.log(err);
            error(err);
        } else {
            console.log('exito en crear iniciativa: '+data._id);
            success(data);
        }
    });
};

exports.update = function(iniciativa, success, error) {
    Iniciativa.update({code: iniciativa.code}, iniciativa, function(err) {
        if(err) {
           error(err);
        } else {
           success();
        }
    });
};

exports.remove = function(id, success, error) {

    Iniciativa.remove({_id: id}, function(err) {
        if(err) {
            error(err);
        } else {
            console.log('Removido iniciativa : '+id);
            success();
        }
    });
};

exports.update_status = function(success, error) {
    var today = new Date(),
        tomorrow = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    tomorrow.setHours(23);
    tomorrow.setMinutes(59);
    tomorrow.setSeconds(59);

    async.parallel({
        to_active: function(sub_callback) {
            console.log('to_Active');
            Iniciativa.update(
                {
                    start_date: { $lte: tomorrow },
                    end_date: { $gte: today },
                    current_stage: 'PREPARACION'
                },
                { $set: { current_stage: 'ACTIVO' } },
                { multi: true },
                sub_callback
            );
        },
        to_finish: function(sub_callback) {
            console.log('to_finish');
            Iniciativa.update(
                {
                    end_date: { $lt: today },
                    current_stage: { $ne: 'FINALIZADO' }
                },
                { $set: { current_stage: 'FINALIZADO' } },
                { multi: true },
                sub_callback
            );
        }},
        function(err, results) {
            console.log(results);
            if (err) {
                console.error(err);
            }
            console.log('end');
            success(results, err);
        }
    );
	

};




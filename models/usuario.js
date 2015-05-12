var mongoose = require('mongoose/'),
    mongoosastic = require('mongoosastic'),
    us = require('underscore'),
    Schema = mongoose.Schema,
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;

var UsuarioSchema = new Schema({
    username:  String,
    password:   String,
    first_name:   String,
    last_name:   String,
    email:   String,
    organization_name: String,
    contact_email: String,
    website: String,
    location:   String,
    facebook_id:   String,
    twitter_id:   String,
    authenticate_with: String,
    birthdate: Date,
    picture: String,
    profile_picture: String,
    about: String,
    /**
     * Iniciativa a las que se anotó.
     */
    iniciativas:    [{
        id: String,
        name: String,
        description: String,
        profile_picture: String,
    }],
    /**
     * Iniciativa que el usuario creó.
     */
    ownedIniciativas:    [{
        id: String,
        name: String,
        description: String,
        profile_picture: String,
    }],
    cantidad_actividades:  {type: Number, default: 0},
    /**
     * Not being used, it will store a list of all the activities of the user.
     * For example: 'crea iniciativa', 'participo iniciativa', 'comento en iniciativa', etc.
     */
    activities: [{
        date: { type: Date, default: Date.now },
        description: { type: Date, default: Date.now },
        refers_to: String
    }],
    implementation: {type: String, default: ''},
    implementation_admin: {type: Boolean, default: false},
    verified: { type: Boolean, default: false},
    last_time_access: { type: Date, default: Date.now },
    creation_date: { type: Date, default: Date.now },
    modification_date: { type: Date, default: Date.now },
    networks: {
        facebook: {
            has: {type: Boolean, default: false},
            user_id: String
        },
        twitter: {
            has: {type: Boolean, default: false},
            user_id: String
        },
        vimeo: {
            has: {type: Boolean, default: false},
            user_id: String
        },
        youtube: {
            has: {type: Boolean, default: false},
            user_id: String
        },
        flickr: {
            has: {type: Boolean, default: false},
            user_id: String
        }
    }

});

var limit = 150;

UsuarioSchema.pre('save', function(next) {
    var user = this;

    if (!user.isModified('password')) {
        return next();
    }
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) {
            return next(err);
        }

        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) {
                return next(err);
            }
            user.password = hash;
            next();
        });
    });


});

UsuarioSchema.methods.comparePassword = function(candidatePassword, callback) {

    if(!this.password ){
        callback(null, false);
    }
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) {
            return callback(err);
        }
        callback(null, isMatch);
    });
};

UsuarioSchema.plugin(mongoosastic, {
	hosts: [
		'http://104.236.192.8:8080'
		//'http://localhost:9200'
	]
});


var Usuario = mongoose.model('Usuario', UsuarioSchema);

exports.Model = Usuario;

exports.list = function(success) {
  Usuario.find().sort('-creation_date').limit(limit).select('username first_name last_name email location iniciativas').exec(function (arr,data) {
    success(data);
  });
};

exports.listOwners = function(success) {
  Usuario.find().limit(limit).select('username first_name last_name email location iniciativas').exec(function (arr,data) {
    success(data);
  });
};

exports.get = function(id, success) {
  Usuario.findOne({username: id}).exec(success);
};

exports.alreadyExists = function(id, success, wrong) {
  Usuario.find({username: id}).limit(limit).exec(function (arr,data) {
    if(typeof data[0] !== 'undefined') {
        console.log('[logic/users.js alreadyExists] User [' + id + '] already exists');
        wrong({error: 'username_already_exists'});
    } else {
        console.log('[logic/users.js alreadyExists] User [' + id + '] does not exist');
        success(data);
    }
  });
};


exports.findOne = function(query, callback) {
    Usuario.findOne(query, callback);
};

exports.insert = function(usuario, success, error) {
    var usuario_model = new Usuario(usuario);
    usuario_model.save(function(err, data) {
        if(err) {
            console.log(err);
            error(err);
        } else {
            console.log('[logic/users.js insert] usuario creado');
            success(data);
        }
    });
};

exports.update = function(usuario, success, error) {
    Usuario.update({username: usuario.username}, usuario, function(err) {
        if(err) {
           error(err);
        } else {
           success();
        }
    });
};

exports.remove = function(id, success, error) {
    Usuario.remove({username: id}, function(err) {
        if(err) {
            error(err);
        } else {
            success();
        }
    });
};


 

var Iniciativa = require('../models/iniciativa.js'),
    Usuario = require('../models/usuario.js'),
    nodemailer = require('nodemailer'),
    us = require('underscore');

exports.list = function(req, res, next) {
    Iniciativa.list(
        function(data) {
            res.send(data);
        },
        function(err) {
            res.send(err);
        }
    );
};

exports.browseByUser = function(req, res, next) {
    var user_id = req.params.user_id; 

    console.log('Buscando por usuario: '+user_id);
    Iniciativa.Model.find('{owner.user:user_id}').exec(
        function (err, iniciativas) {
            if (err) return handleError(err);
            res.send(iniciativas);
        }
    );

};

exports.browseByCategory = function(req, res, next) {
    var category = req.params.category; 

    console.log('Buscando por categoria: '+category);
    Iniciativa.Model.find().where('profile_picture').exists(true).where('categories.'+category).equals(true).exec(
    //Iniciativa.Model.find('{categories.'+category+': true, profile_picture:{$exists:true}}').equals(true).exec(
        function (err, iniciativas) {
            if (err) return handleError(err);
            res.send(iniciativas);
        }
    );

};

exports.create = function(req, res, next) {
    var body = req.body;
    if (body.start_date_timestamp) {
        body.start_date = new Date(body.start_date_timestamp);
        delete body.start_date_timestamp;
    }
    if (body.end_date_timestamp) {
        body.end_date = new Date(body.end_date_timestamp);
        delete body.end_date_timestamp;
    }
    console.log("[iniciativa.js create] Creating new Iniciativa:");
    console.dir(body);
    Iniciativa.insert(
        body,
        function(data) {
            Usuario.Model.findById(body.owner.user).exec(function (err, user) {
                if(user) {
                    user.update({ 
                            $push: {
                                'ownedIniciativas': {
                                    id: data._id,
                                    name: body.name,
                                    description: body.description,
                                    profile_picture: body.profile_picture
                                }
                            }   
                        },
                        function() {
                           send_mail_created(user, data);
                           res.send(data);
                        } 
                    );
                }
            });

        },
        function(err) {
            console.log(err);
            res.send({error: err});
        }
    );
};


exports.save = function(req, res, next) {
    var iniciativa_id = req.params.id;
    console.log('[iniciativas::save] Guardando iniciativa: ' + iniciativa_id);
    var body = req.body;
    if (body.start_date_timestamp) {
        body.start_date = new Date(body.start_date_timestamp);
        delete body.start_date_timestamp;
    }
    if (body.end_date_timestamp) {
        body.end_date = new Date(body.end_date_timestamp);
        delete body.end_date_timestamp;
    }
    Iniciativa.Model.findById(iniciativa_id, function (err, iniciativa) {
        if (err) return handleError(err);
        us.extend(iniciativa, body);
        iniciativa.save(function (err) {
        if (err) return handleError(err);
            res.send(iniciativa);
        });
    });
}

exports.participate = function(req, res, next) {
    var iniciativaId = req.params.id,
        userId = req.params.userId;
    console.log("[iniciativa.js::participate] About to add member [%s] to iniciativa [%s]", userId, iniciativaId);
    Iniciativa.Model.findById(iniciativaId, function (err, iniciativa) {
        if (err) {
            console.error("[iniciativa.js::participate] Error in participate, findById [%s]", iniciativaId);
            console.error(err);
            res.send(err)
        }
        if (!iniciativa) {
            console.log("[iniciativa.js::participate] Iniciativa not found!: " + iniciativaId);
            return res.send("Iniciativa not found.");
        }
        if (iniciativa.owner.user === userId) {
            console.log("[iniciativa.js::participate] El Owner de la iniciativa no puede ser agregado como miembre de la misma");
            res.send({
                numUsuarioAffected: 0,
                numIniciativaAffected: 0
            });
        }
        Iniciativa.participate(iniciativa, userId, function(err, data) {
            if (err) {
                console.error("[iniciativa.js::participate] Error in participate, Iniciativa.participate [%s]", iniciativaId);
                console.error(err);
                res.send(err)
            }
            console.log("[iniciativa.js::participate] [%d] Usuarios agregados a [%d] iniciativas", data.numUsuarioAffected, data.numIniciativaAffected);
            res.send(data)
        });
    });
};

exports.quitIniciativa = function(req, res, next) {
    var iniciativaId = req.params.id,
        userId = req.params.userId;
    console.log("[iniciativa.js::quitIniciativa] About to quit member [%s] from iniciativa [%s]", userId, iniciativaId);
    Iniciativa.Model.findById(iniciativaId, function (err, iniciativa) {
        if (err) {
            console.error("[iniciativa.js::quitIniciativa] Error in quitIniciativa, findById [%s]", iniciativaId);
            console.error(err);
            res.send(err)
        }
        if (!iniciativa) {
            console.log("[iniciativa.js::quitIniciativa] Iniciativa not found!: " + iniciativaId);
            return res.send("Iniciativa not found.");
        }
        Iniciativa.quitIniciativa(iniciativa, userId, function(err, data) {
            if (err) {
                console.error("[iniciativa.js::quitIniciativa] Error in quitIniciativa, Iniciativa.participate [%s]", iniciativaId);
                console.error(err);
                res.send(err)
            }
            console.log("[iniciativa.js::quitIniciativa] [%d] Usuarios removido a [%d] iniciativa", data.numUsuarioAffected, data.numIniciativaAffected);
            res.send(data)
        });
    });
};

exports.findById = function(req, res, next) {
    var iniciativa_id = req.params.id;
    console.log('Iniciativa id: '+ iniciativa_id);
    Iniciativa.Model.findById(iniciativa_id).exec(function(err, result) {
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

exports.findByName = function(req, res, next) {
    var slug = req.params.name;
    console.log('Iniciativa Slug: '+slug);
    Iniciativa.Model.find({'slug':slug}).limit(1).exec(function(err, result) {
        console.dir(result);
        console.log(err);
        if(result) {
            res.send(result);
        } else {
            res.send(404, {});
        }
    });
};

/**
 * Returns all the iniciativas near a given lat and log whose endDate is posterior to yesterday.
 */
exports.findLast = function(req, res, next) {
    console.log("[iniciativa.js findLast] Fetching last iniciativas:");
    console.dir(req.params);
    var lat = req.params.lat,
        lng = req.params.lng,
        yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    Iniciativa.Model.find(
        {
            end_date: { $gt: yesterday },
            coords:
            {
                $near : [lng, lat],
                $maxDistance : 500/111.2
            }
        }).where('profile_picture').exists(true).sort('-start_date')
        .exec(function(err, result) {
            if(result) {
                console.log("[iniciativa.js findLast] Resultados: " + result.length);
                res.send(result);
            } else {
                console.log("[iniciativa.js findLast] Resultados: 0");
                res.send(404, {});
            }
        }
    );
};


exports.update_status = function(success) {
    Iniciativa.update_status(function(s) {
        success();
    });
};

exports.findByIdWithOwnerAndMembers = function(req, res, next) {
    var iniciativa_id = req.params.id;
    var number_of_members = parseInt(req.params.number_of_members, 10);
    if (number_of_members === NaN) {
        number_of_members = 0;
    }
    Iniciativa.Model.findById(iniciativa_id).exec(function onIniciativaFound(err, iniciativa) {
        result = {};
        if (err) {
          console.error("[iniciativa::findByIdWithOwnerAndMembers] Thera has been an error fetching iniciativa ["
              + iniciativa + "]: " + err);
        }
        if(iniciativa) {
            result['iniciativa'] = iniciativa;
            var userIds = [iniciativa.owner.user];
            if (iniciativa.members) {
                for (var i=0, len=iniciativa.members.length; i < len; i++) {
                    userIds.push(iniciativa.members[i].user);
                }
            }
            Usuario.Model.find({
                '_id': {
                    "$in": userIds
                }
            }).limit(number_of_members + 1).exec(function (err, users) {
                if (users) {
                    for (i=0, len=users.length; i < len; i++) {
                        if (users[i]._id.toString() === iniciativa.owner.user) {
                            result['owner'] = users[i];
                            users.splice(i, 1);
                            break;
                        }
                    }
                    result['members'] = users;
                }
                res.send(result);
            });
            
        } else {
            res.send(404, {});
        }
    });
};

send_mail_created = function(owner, iniciativa) {
       var transporter = nodemailer.createTransport();
       var data_to_send = {
           from: 'info@coperable.com.ar',
           to: owner.email,
           subject: 'Iniciativa Creada',
           text: 'Estos son los datos de la iniciativa: '+iniciativa.name+' link: http://coperable.com.ar/iniciativas/'+iniciativa._id
       };
    console.dir(transporter);
       transporter.sendMail(data_to_send, function(err, info) {

        console.log("Error sending? "+err);
        console.dir(info);
        console.log("Inicaitvia enviada");
       });
};
    


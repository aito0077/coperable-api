var Iniciativa = require('../models/iniciativa.js'),
    Usuario = require('../models/usuario.js'),
    nodemailer = require('nodemailer'),
    Topic = require('../models/topic.js'),
    es = require('elasticsearch'),
    client = new es.Client({
        host: 'localhost:9200'
    }),
    _ = require('underscore');

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


exports.search = function(req, res, next) {
    console.log(req.params.q);
    Iniciativa.Model.search({
	query_string: {
		query: req.params.q
	}
    }, function(error, results) {
        res.send(results);
    });
};

exports.aggregations = function(req, res, next) {
    client.search({
        index: 'iniciativas',
        search_type: 'count',
        body: {
            aggs: {
                histogram: {
                    date_histogram: {
                        field: 'start_date',
                        interval: 'month',
                        min_doc_count: 1,
                        format: 'M'
                    }
                },
                main_categories: {
                    terms: {
                        field: 'main_category'
                    }
                },
                topics: {
                    terms: {
                        field: 'topics'
                    }
                },
                comunidades: {
                    terms: {
                        field: 'comunidades.name'
                    }
                }
 
            }
        }
    }, function(error, response) {
        res.send(response);
    });
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
    var category = req.params.category, 
        yesterday = new Date();

    console.log('Buscando por categoria: '+category);
    if(category == 'all') {
        Iniciativa.Model.find({
            end_date: { $gt: yesterday }
        }).where('profile_picture').exists(true).exec(
            function (err, iniciativas) {
                if (err) return handleError(err);
                res.send(iniciativas);
            }
        );
    } else {
        Iniciativa.Model.find({
            end_date: { $gt: yesterday }
        }).where('profile_picture').exists(true).where('categories.'+category).equals(true).exec(
            function (err, iniciativas) {
                if (err) return handleError(err);
                res.send(iniciativas);
            }
        );
    }

};

var updateTopicsList = function (iniciativa, done) {
    console.log("---------------------------------");
    if (iniciativa.topics) {
        var topic_models = [];
        _.each(iniciativa.topics, function(topic) {
            Topic.update(topic, iniciativa._id, function(data) {
                topic_models.push(data);
                if (topic_models.length === iniciativa.topics.length) {
                    done(topic_models);
                }
            });
        });
    }
};

exports.create = function(req, res, next) {
    console.log("[previous create]:");
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
                console.log(err);
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
                            updateTopicsList(data, function(topic_models) {
                                if(user.email) {
                                    send_mail_created(user, data);
                                }
                                res.send(data);
                            });
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
        _.extend(iniciativa, body);
        iniciativa.save(function (err) {
            if (err) return handleError(err);
            updateTopicsList(data, function(iniciativa) {
                res.send(iniciativa);
            });
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

exports.getTags = function(req, res, next) {
    var query= req.body;
    var results = {};
    Iniciativa.Model.distinct('topics',query).populate('topics').exec(function (err, topics) { 
        results['topics']  = topics || [];

        Iniciativa.Model.distinct('tasks.tag',query).populate('tasks').exec(function (err, tasks) { 
            results['tasks']  = [];
            if(tasks) {
                _.each(tasks, function(model) {
                    results['tasks'].push(model);
                } );
            }

            res.send(results);
        });


    });


};




exports.findByQuery = function(req, res, next) {
    var query= req.body;
    console.log("Find by query");
    Iniciativa.Model.find(query).sort('start_date').exec(function(err, result) {
        console.dir(result);
        console.log(err);
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
        limit = req.query.limit || 30,
        yesterday = new Date();
        console.dir(req.query);
    yesterday.setDate(yesterday.getDate() - 1);
    console.log("[iniciativa.js findLast] Limite: " + limit);

    Iniciativa.Model.find(
        {
            end_date: { $gt: yesterday },
            coords:
            {
                $near : [lng, lat],
                $maxDistance : 500/111.2
            }
        }).where('profile_picture').exists(true).sort('-start_date').limit(limit)
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
    


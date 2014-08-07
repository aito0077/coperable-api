var mongoose = require('mongoose/'),
    _ = require('underscore'),
    Schema = mongoose.Schema;


var TopicSchema = new Schema({
    name:  String,
    iniciativas: [{
        iniciativa_id: String
    }],
    last_update: { type: Date, default: Date.now }
});

var Topic = mongoose.model('Topic', TopicSchema);

exports.Model = Topic;

var limit = 20;

exports.list = function(success) {
  Topic.find().sort('-last_update').limit(limit).exec(function (err, data) {
    success(data);
  });
};

exports.update = function(topic, iniciativa_id, done) {
  Topic.findOne({name: topic}).exec(function (err, topic_model) {
    if (err) {
        console.error("[topic::update] An error ocurred while updating: %j", err)
    }
    var needs_to_save = false;
    if(!topic_model) {
        var topic_model = new Topic({
            name: topic
        });
        topic_model.iniciativas.push({
            iniciativa_id: iniciativa_id
        });
        console.log("[topic::update] Adding new topic [%s] with iniciativa [%s]", topic, iniciativa_id);
        needs_to_save = true;
    } else if (!_.contains(topic_model.iniciativas, iniciativa_id)) {
        topic_model.iniciativas.push({
            iniciativa_id: iniciativa_id
        });
        topic_model.last_update = Date.now();
        console.log("[topic::update] Updating topic [%s] with iniciativa [%s]", topic, iniciativa_id);
        needs_to_save = true;
    }
    if (needs_to_save) {
        topic_model.save(function(err, data) {
            if(err) {
                console.error("[topic::update] An error ocurred while updating: %j", err);
            }
            done(data);
        });
    } else {
        done(data);
    }
  });
};

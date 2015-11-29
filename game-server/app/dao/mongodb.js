var mongojs = require('mongojs')
var mongoConfig = require('../../../shared/config/mongo');

var db = mongojs(mongoConfig.url, ['user', 'player']);

db.player.ensureIndex({ uid: 1 });


module.exports = db;
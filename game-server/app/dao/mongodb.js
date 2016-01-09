var mongojs = require('mongojs')
var mongoConfig = require('../../../shared/config/mongo');

var db = mongojs(mongoConfig.url, ['user', 'player', 'gameRecord']);

db.player.ensureIndex({ uid: 1 });

db.gameRecord.ensureIndex({roomId: 1, result: 1, meeting: 1, createdAt: 1});


module.exports = db;
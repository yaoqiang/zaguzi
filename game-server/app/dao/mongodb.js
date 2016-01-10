var mongojs = require('mongojs')
var mongoConfig = require('../../../shared/config/mongo');

var db = mongojs(mongoConfig.url, ['user', 'player', 'gameRecord', 'exchangeList', 'exchangeRecord']);

db.player.ensureIndex({ uid: 1 });

db.gameRecord.ensureIndex({roomId: 1, result: 1, meeting: 1});

db.exchangeList.ensureIndex({});

db.exchangeRecord.ensureIndex({uid: 1});


module.exports = db;
var mongojs = require('mongojs')
var mongoConfig = require('../../../shared/config/mongo');

var db = mongojs(mongoConfig.url,
    ['user', 'player', 'exchangeList', 'exchangeRecord', 'rankingList',
        'appReleaseRecord', 'order', 'captcha', 'systemMessage', 'serialCode',
        'appleSetting'
    ]);

db.player.ensureIndex({uid: 1, meetingTimes: 1, createdAt: 1});
db.player.ensureIndex({meetingTimes: 1, createdAt: 1});
db.player.ensureIndex({meetingTimes: 1});
db.player.ensureIndex({createdAt: 1});


db.exchangeList.ensureIndex({});

db.exchangeRecord.ensureIndex({uid: 1});
db.exchangeRecord.ensureIndex({createdAt: 1});

db.rankingList.ensureIndex({type: 1, date: 1});


db.order.ensureIndex({uid: 1, state: 1});
db.order.ensureIndex({uid: 1, state: 1, orderSerialNumber: 1});
db.order.ensureIndex({orderSerialNumber: 1});
db.order.ensureIndex({uid: 1});
db.order.ensureIndex({state: 1});
db.order.ensureIndex({device: 1});
db.order.ensureIndex({channel: 1});
db.order.ensureIndex({productId: 1});
db.order.ensureIndex({createdAt: 1});
db.order.ensureIndex({transactionId: 1});

db.appReleaseRecord.ensureIndex({version: 1});

db.captcha.ensureIndex({mobile: 1});

db.systemMessage.ensureIndex({enabled: 1});

module.exports = db;
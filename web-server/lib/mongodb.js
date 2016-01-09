var mongojs = require('mongojs')
var mongoConfig = require('../../shared/config/mongo');

var db = mongojs(mongoConfig.url, ['user', 'player', 'captcha']);


//index
db.user.ensureIndex({username: 1});

db.captcha.ensureIndex({mobile: 1});

module.exports = db;
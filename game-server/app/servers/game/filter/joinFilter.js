var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');

module.exports = function() {
    return new Filter();
}

var Filter = function() {
};

Filter.prototype.before = function (msg, session, next) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, msg.uid, function (err, user) {
        msg.player = user.player;


    }
    next();
};

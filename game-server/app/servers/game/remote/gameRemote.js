var gameService = require('../../../services/gameService');
var utils = require('../../../util/utils');
var pomelo = require('pomelo');

module.exports = function(app) {
    return new GameRemote(app);
};

var GameRemote = function(app) {
    this.app = app;
};

/**
 * Add user into room.
 *
 * @param {String} msg
 *
 */
GameRemote.prototype.join = function(msg, cb) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, msg.uid, function (err, user) {
        msg.player = user.player;
        gameService.join(msg, function(ret) {
            utils.invokeCallback(cb, null, ret);
        });
    });

};

/**
 * Kick user out room.
 *
 *
 */
GameRemote.prototype.kick = function(data) {
    gameService.kick(data);
};

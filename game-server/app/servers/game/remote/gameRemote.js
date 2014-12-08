var gameService = require('../../../services/gameService');

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
    gameService.join(msg, cb);
};

/**
 * Kick user out room.
 *
 *
 */
GameRemote.prototype.kick = function(data) {
    gameService.kick(data);
};

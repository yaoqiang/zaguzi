var gameService = require('../../../services/gameService');
var Code = require('../../../../../shared/code');
var utils = require('../../../util/utils');
var _ = require('underscore');

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
    var ret = gameService.join(msg);
    utils.invokeCallback(cb, null, ret);
};

/**
 * Kick user out room.
 *
 *
 */
GameRemote.prototype.kick = function(data) {
    gameService.kick(data);
};

var playerService = require('../../../services/playerService');
var Code = require('../../../../../shared/code');
var utils = require('../../../util/utils');
var _ = require('underscore');

module.exports = function(app) {
    return new UserRemote(app);
};

var UserRemote = function(app) {
    this.app = app;
};

/**
 * get user by uid from cache.
 *
 * @param {String} msg
 *
 */
UserRemote.prototype.getUserCacheByUid = function(msg, cb) {
    console.log('msg=> ',msg)

    playerService.getUserCacheByUid(msg, function(ret) {
        utils.invokeCallback(cb, null, ret);
    });
};


/**
 * get user by sessionId from cache.
 *
 * @param {String} msg
 *
 */
UserRemote.prototype.getUserCacheBySessionId = function(msg, cb) {
    playerService.getUserCacheBySessionId(msg, function(ret) {
        utils.invokeCallback(cb, null, ret);
    });
};

UserRemote.prototype.getUserInfo = function (data, cb) {
    playerService.getUserInfo(data.uid, cb);
};

UserRemote.prototype.onUserEnter = function (data, cb) {
    console.log('data =>',data)
    playerService.onUserEnter(data.uid, data.serverId, data.sessionId, data.player, cb);
};

UserRemote.prototype.onUserLeave = function (data, cb) {
    playerService.onUserLeave(data.uid, cb);
};
var playerService = require('../../../services/playerService');
var Code = require('../../../../../shared/code');
var utils = require('../../../util/utils');
var _ = require('lodash');

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
    playerService.getUserCacheByUid(msg, function(ret) {
        cb(ret);
    });
};

UserRemote.prototype.getUsersCacheByUids = function(msg, cb) {
    playerService.getUsersCacheByUids(msg, function(ret) {
        cb(ret);
    });
};

UserRemote.prototype.updateProfile = function (msg, cb) {
    playerService.updateProfile(msg, cb);
}

UserRemote.prototype.win = function(msg, cb) {
    playerService.win(msg, function(ret) {
        cb(ret);
    });
};

UserRemote.prototype.lose = function(msg, cb) {
    playerService.lose(msg, function(ret) {
        cb(ret);
    });
};

UserRemote.prototype.tie = function(msg, cb) {
    playerService.tie(msg, function(ret) {
        cb(ret);
    });
};

UserRemote.prototype.balance = function(msg, cb) {
    playerService.balance(msg, function(ret) {
        cb(ret);
    });
};

UserRemote.prototype.getCheckInGrant = function (msg, cb) {
    playerService.getCheckInGrant(msg, cb);
}

UserRemote.prototype.getBankruptcyGrant = function (msg, cb) {
    playerService.getBankruptcyGrant(msg, cb);
}

UserRemote.prototype.getDailyTaskList = function (msg, cb) {
    playerService.getDailyTaskList(msg, cb);
}

UserRemote.prototype.getForeverTaskList = function (msg, cb) {
    playerService.getForeverTaskList(msg, cb);
}

UserRemote.prototype.getTaskGrant = function (msg, cb) {
    playerService.getTaskGrant(msg, cb);
}

UserRemote.prototype.getMyItemList = function (msg, cb) {
    playerService.getMyItemList(msg, cb);
}

UserRemote.prototype.getExchangeList = function (msg, cb) {
    playerService.getExchangeList(msg, cb);
}

UserRemote.prototype.exchange = function (msg, cb) {
    playerService.exchange(msg, cb);
}


/**
 * get user by sessionId from cache.
 *
 * @param {String} msg
 *
 */
UserRemote.prototype.getUserCacheBySessionId = function(msg, cb) {
    playerService.getUserCacheBySessionId(msg, function(ret) {
        cb(ret);
    });
};

UserRemote.prototype.getUserInfo = function (data, cb) {
    playerService.getUserInfo(data.uid, cb);
};

UserRemote.prototype.onUserEnter = function (data, cb) {
    playerService.onUserEnter(data.uid, data.serverId, data.sessionId, data.player, cb);
};

UserRemote.prototype.onUserDisconnect = function (data, cb) {
    playerService.onUserDisconnect(data, cb);
};

UserRemote.prototype.onUserJoin = function (uid, roomId, gameId, cb) {
    playerService.setGameReference(uid, roomId, gameId, cb);
};

UserRemote.prototype.onUserLeave = function (uid, cb) {
    playerService.setGameReference(uid, null, null, cb);
};

UserRemote.prototype.setUserSessionId = function (uid, sessionId, cb) {
    playerService.setUserSessionId(uid, sessionId);
    cb();
}
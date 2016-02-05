var _ = require('lodash');

var Code = require('../../../../../shared/code');

var playerService = require('../../../services/playerService');
var exchangeService = require('../../../services/exchangeService');

var utils = require('../../../util/utils');

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

UserRemote.prototype.getProfileByUid = function (msg, cb) {
    this.getUserCacheByUid(msg.uid, function (ret) {
        playerService.getUserInfo(msg.uid, function (result) {
            if (result) {
                cb({player: ret.player, userInfo: {mobile: result.mobile}});
                return;
            }
            cb({player: ret.player});
        });

    });
}

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

UserRemote.prototype.getDailyTodoInfo = function (msg, cb) {
    playerService.getDailyTodoInfo(msg, function (ret) {
        cb(ret);
    })
}

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

//////////////////////////////////
// 兑换相关
//////////////////////////////////
UserRemote.prototype.getExchangeList = function (msg, cb) {
    exchangeService.getExchangeList(msg, cb);
}

UserRemote.prototype.getMyExchangeRecordList = function (msg, cb) {
    exchangeService.getMyExchangeRecordList(msg, cb);
}

UserRemote.prototype.exchange = function (msg, cb) {
    exchangeService.exchange(msg, cb);
}


///////////////////////////
/// 玩家状态相关
///////////////////////////
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

UserRemote.prototype.getOnlineUserResultCache = function (data, cb) {
    cb({code: Code.OK, online: playerService.getOnlineUserResultCache()});
}
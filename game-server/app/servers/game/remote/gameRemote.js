var gameService = require('../../../services/gameService');
var shopService = require('../../../services/shopService');
var utils = require('../../../util/utils');
var pomelo = require('pomelo');
var consts = require('../../../consts/consts');
var loggerErr = require('log4js').getLogger(consts.LOG.ERROR);
var logger = require('log4js').getLogger(consts.LOG.GAME);
var Code = require('../../../../../shared/code');

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
GameRemote.prototype.join = function(data, cb) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, data.uid, function (user) {
        if (user === undefined || user == null) {
            loggerErr.debug('%j', {method: "game.gameRemote.join", uid: data.uid, data: data, desc: '加入房间时, uid不在用户缓存'});
            logger.debug('game||join||加入游戏失败, 玩家已下线||用户&ID: %j', data.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.JOIN.ERR});
            return;
        }
        if (user.gameId) {
            logger.debug('game||join||加入游戏失败, 玩家已加入牌桌||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.JOIN.IN_GAME});
            return;
        }
        data.player = user.player;
        gameService.join(data, function(ret) {
            pomelo.app.rpc.manager.userRemote.onUserJoin(null, data.uid, data.roomId, ret.gameId, function () {
                cb(ret);
            });
        });
    });

};

/**
 * Kick user out room.
 *
 *
 */
GameRemote.prototype.leave = function(data, cb) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, data.uid, function (user) {
        if (user === undefined || user == null) {
            logger.debug('game||leave||离开游戏失败, 玩家已下线||用户&ID: %j', data.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.LEAVE.NOT_IN_GAME});
            return;
        }
        if (user.gameId == null) {
            logger.debug('game||leave||离开游戏失败, 玩家不在牌桌中||用户&ID: %j', data.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.LEAVE.NOT_IN_GAME});
            return;
        }

        gameService.leave({uid: data.uid, gameId: user.gameId}, cb);

    });

};

/**
 * ready
 * @param data {uid: xx, gameId:xx}
 * @param cb
 */
GameRemote.prototype.ready = function (data, cb) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, data.uid, function (user) {
        if (user === undefined || user == null) {
            logger.debug('game||ready||准备失败, 玩家已下线||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.READY.NOT_IN_GAME});
            return;
        }
        if (user.gameId == null) {
            logger.debug('game||ready||准备失败, 玩家不在牌桌中||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.READY.NOT_IN_GAME});
            return;
        }
        data.player = user.player;
        gameService.ready(data, cb);
    });
}

/**
 * 说话
 * @param data
 * @param cb
 */
GameRemote.prototype.talk = function (data, cb) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, data.uid, function (user) {
        if (user === undefined || user == null) {
            logger.debug('game||talk||说话失败, 玩家已下线||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.READY.NOT_IN_GAME});
            return;
        }
        if (user.gameId == null) {
            logger.debug('game||talk||说话失败, 玩家不在牌桌中||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.READY.NOT_IN_GAME});
            return;
        }
        gameService.talk(data, cb);
    });
}

/**
 * 出牌
 * @param data
 * @param cb
 */
GameRemote.prototype.fan = function (data, cb) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, data.uid, function (user) {
        if (user === undefined || user == null) {
            logger.debug('game||fan||出牌失败, 玩家已下线||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.ERR});
            return;
        }
        if (user.gameId == null) {
            logger.debug('game||fan||出牌失败, 玩家不在牌桌中||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.ERR});
            return;
        }
        gameService.fan(data, cb);
    });
}

/**
 * 托管
 * @param data
 * @param cb
 */
GameRemote.prototype.trusteeship = function (data, cb) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, data.uid, function (user) {
        if (user === undefined || user == null) {
            logger.debug('game||trusteeship||托管失败, 玩家已下线||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.ERR});
            return;
        }
        if (user.gameId == null) {
            logger.debug('game||trusteeship||托管失败, 玩家不在牌桌中||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.NOT_IN_GAME});
            return;
        }
        gameService.trusteeship(data, cb);
    });
}

/**
 * 取消托管
 * @param data
 * @param cb
 */
GameRemote.prototype.cancelTrusteeship = function (data, cb) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, data.uid, function (user) {
        if (user === undefined || user == null) {
            logger.debug('game||trusteeship||取消托管失败, 玩家已下线||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.NOT_IN_GAME});
            return;
        }
        if (user.gameId == null) {
            logger.debug('game||trusteeship||取消托管失败, 玩家不在牌桌中||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.ERR});
            return;
        }
        gameService.cancelTrusteeship(data, cb);
    });
}

/**
 * 牌局内聊天
 */
GameRemote.prototype.chat = function (data, cb) {
    //在chatHandler已判断玩家是否在缓存;
    gameService.chat(data, cb);
}


/**
 * 通过游戏ID获得当前游戏状态
 * @param data
 * @param cb
 */
GameRemote.prototype.getGameStatusById = function (data, cb) {
    var game = gameService.getGameById(data.gameId);
    cb({gameLogic: game.gameLogic});
}

/**
 * 通过游戏ID获得当前游戏状态明细信息
 * @param data
 * @param cb
 */
GameRemote.prototype.getGameStatusDetailsById = function (data, cb) {
    gameService.getGameStatusDetailsById(data, cb);
}


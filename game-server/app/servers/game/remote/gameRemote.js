var gameService = require('../../../services/gameService');
var utils = require('../../../util/utils');
var pomelo = require('pomelo');
var consts = require('../../../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.GAME);
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
        if (user == undefined || user == null) {
            logger.error('game||join||加入游戏失败, 玩家已下线||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.JOIN.ERR});
            return;
        }
        if (user.gameId) {
            logger.error('game||join||加入游戏失败, 玩家已加入牌桌||用户&ID: %j', user.uid);
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
        if (user == undefined || user == null) {
            logger.error('game||leave||离开游戏失败, 玩家已下线||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.LEAVE.NOT_IN_GAME});
            return;
        }
        if (user.gameId == null) {
            logger.error('game||leave||离开游戏失败, 玩家不在牌桌中||用户&ID: %j', user.uid);
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
        if (user == undefined || user == null) {
            logger.error('game||ready||准备失败, 玩家已下线||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.READY.NOT_IN_GAME});
            return;
        }
        if (user.gameId == null) {
            logger.error('game||ready||准备失败, 玩家不在牌桌中||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.READY.NOT_IN_GAME});
            return;
        }
        gameService.ready(data, cb);
    });
}

GameRemote.prototype.talk = function (data, cb) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, data.uid, function (user) {
        if (user == undefined || user == null) {
            logger.error('game||talk||说话失败, 玩家已下线||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.READY.NOT_IN_GAME});
            return;
        }
        if (user.gameId == null) {
            logger.error('game||talk||说话失败, 玩家不在牌桌中||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.READY.NOT_IN_GAME});
            return;
        }
        gameService.talk(data, cb);
    });
}

GameRemote.prototype.fan = function (data, cb) {
    pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, data.uid, function (user) {
        if (user == undefined || user == null) {
            logger.error('game||fan||出牌失败, 玩家已下线||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.ERR});
            return;
        }
        if (user.gameId == null) {
            logger.error('game||fan||出牌失败, 玩家不在牌桌中||用户&ID: %j', user.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.ERR});
            return;
        }
        gameService.fan(data, cb);
    });
}

/**
 * 通过游戏ID获得当前游戏状态
 * @param data
 * @param cb
 */
GameRemote.prototype.getGameStatusById = function (data, cb) {
    var game = gameService.getGameById(data.gameId);
    cb(game);
}
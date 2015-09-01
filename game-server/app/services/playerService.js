var userDao = require('../dao/userDao');
var _ = require('underscore');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.USER, __filename);
var Code = require('../../../shared/code');
var gameUtil = require('../util/gameUtil');
var eventManager = require('../domain/event/eventManager');
var Player = require('../domain/entity/player');
var Properties = require('../domain/entity/properties');

var messageService = require('./messageService')

var Promise = require('promise');

var exp = module.exports;


exp.getUserInfo = function (uid, cb) {

    userDao.getUserById(uid, function (user) {
        cb(user);
    });

}


exp.onUserEnter = function (uid, serverId, sessionId, player, cb) {
    //add event
    var playerObj = new Player(player);
    var propObj = new Properties(player.properties);

    playerObj.properties = propObj;
    eventManager.addEvent(playerObj);
    var u = _.findWhere(pomelo.app.userCache, {uid: uid});
    if (u) {
        u.serverId = serverId;
        u.sessionId = sessionId;
        u.player = playerObj;
    }
    else {
        pomelo.app.userCache.push({
            uid: uid,
            serverId: serverId,
            sessionId: sessionId,
            roomId: null,
            gameId: null,
            player: playerObj
        });
    }
    cb();
}

exp.onUserDisconnect = function (data, cb) {
    var u = _.findWhere(pomelo.app.userCache, {uid: data.uid});

    if (_.isUndefined(u)) {
        logger.warn('uid=>%j', data.uid)
        console.log('pomelo.app.userCache =>', _.pluck(pomelo.app.userCache, 'uid'));
        logger.warn('玩家下线处理时，玩家已离线，玩家ID：%j', data.uid);
        cb();
        return;
    }
    if (u.gameId) {
        //rpc invoke
        var getStatusParams = {
            namespace: 'user',
            service: 'gameRemote',
            method: 'getGameStatusById',
            args: [{
                gameId: u.gameId
            }]
        };

        var room = gameUtil.getRoomById(u.roomId);

        pomelo.app.rpcInvoke(room.serverId, getStatusParams, function (game) {
            //当玩家掉线时，并且玩家正在游戏中，则标识玩家为掉线，结算后再踢掉
            if (game.gameLogic != null && game.gameLogic.currentPhase != consts.GAME.PHASE.OVER) {
                logger.info("user||disconnect||玩家掉线时还在游戏中, 用户ID:%j", data.uid)
                //set user session id = null.
                exp.setUserSessionId(data.uid, null);
            }
            else {
                //rpc invoke
                var leaveParams = {
                    namespace: 'user',
                    service: 'gameRemote',
                    method: 'leave',
                    args: [{
                        uid: data.uid
                    }]
                };

                pomelo.app.rpcInvoke(room.serverId, leaveParams, function (result) {
                    if (result.code == Code.FAIL) {
                        cb();
                        return;
                    }

                    u.player.flushAll();

                    pomelo.app.userCache = _.without(pomelo.app.userCache, u);
                    delete u;
                });

            }
            cb();

        });

    }
    else {

        u.player.flushAll();

        pomelo.app.userCache = _.without(pomelo.app.userCache, u);
        cb();
    }

}


exp.win = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user||win||玩家胜利, 但玩家不在缓存, 用户ID:%j", data.uid);
            cb({code: Code.FAIL});
            return;
        }

        var player = user.player;
        player.win(data.roomId, data.gold, function (result) {
            player.save();
            messageService.pushMessageToPlayer({
                uid: user.uid,
                sid: user.serverId
            }, consts.EVENT.GOLD_CHANGE, {gold: result.gold});
            cb({code: Code.OK});
        });
    });
}

exp.lose = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user||lose||玩家失败, 但玩家不在缓存, 用户ID:%j", data.uid);
            cb({code: Code.FAIL});
            return;
        }

        var player = user.player;
        player.lose(data.roomId, data.gold, function (result) {
            player.save();
            messageService.pushMessageToPlayer({
                uid: user.uid,
                sid: user.serverId
            }, consts.EVENT.GOLD_CHANGE, {gold: result.gold});
            cb({code: Code.OK});
        });
    });
}

exp.tie = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user||tie||玩家失败, 但玩家不在缓存, 用户ID:%j", data.uid);
            cb({code: Code.FAIL});
            return;
        }

        var player = user.player;
        player.tie(data.roomId, function (result) {
            player.save();
            messageService.pushMessageToPlayer({
                uid: user.uid,
                sid: user.serverId
            }, consts.EVENT.GOLD_CHANGE, {gold: result.gold});
            cb({code: Code.OK});
        });
    });
}

exp.balance = function (data, cb) {
    var details = data.details;
    var result = {code: Code.OK}
    //为防止结算未完成时，已将玩家从缓存中移除，所以需保证map结束后，再callback
    Promise.all(_.map(details, function (detail) {
        if (detail.result == consts.GAME.ACTOR_RESULT.WIN) {
            exp.win({uid: detail.uid, roomId: detail.roomId, gold: detail.gold}, function (data) {
            });
        }
        else if (detail.result == consts.GAME.ACTOR_RESULT.LOSE) {
            exp.lose({uid: detail.uid, roomId: detail.roomId, gold: detail.gold * -1}, function (data) {
            });
        }
        else {
            exp.tie({uid: detail.uid, roomId: detail.roomId}, function (data) {
            });
        }
        return Promise.resolve;
    }))
        .then(cb(result))
        .done();
}

exp.getSignInAward = function (data, cb) {

}

exp.getBankruptAward = function (data, cb) {

}

exp.addFragment = function (data, cb) {

}

exp.recharge = function (data, cb) {

}

exp.getUserCacheByUid = function (uid, cb) {
    var u = _.findWhere(pomelo.app.userCache, {uid: uid});
    cb(u);
}
exp.getUsersCacheByUids = function (data, cb) {
    var users = [];
    _.map(data.uids, function (uid) {
        var u = _.findWhere(pomelo.app.userCache, {uid: uid});
        users.push(u);
    });
    cb(users);
}

exp.getUserCacheBySessionId = function (sessionId, cb) {
    var u = _.findWhere(pomelo.app.userCache, {sessionId: sessionId});
    cb(u);
}

exp.getReceiverByUid = function (uid, cb) {

}

exp.setGameReference = function (uid, roomId, gameId) {
    var user = _.findWhere(pomelo.app.userCache, {uid: uid});
    user.roomId = roomId;
    user.gameId = gameId;
};

exp.setUserSessionId = function (uid, sessionId) {
    var user = _.findWhere(pomelo.app.userCache, {uid: uid});
    user.sessionId = sessionId;
}
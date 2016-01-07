var userDao = require('../dao/userDao');
var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.USER);
var Code = require('../../../shared/code');
var gameUtil = require('../util/gameUtil');
var eventManager = require('../domain/event/eventManager');
var Player = require('../domain/entity/player');

var messageService = require('./messageService')

var globals = require('../../config/data/globals');

var Promise = require('promise');

var exp = module.exports;

/**
 * 获得用户信息
 */
exp.getUserInfo = function (uid, cb) {

    userDao.getUserById(uid, function (user) {
        cb(user);
    });

}

/**
 * 当用户进入游戏后处理各种XX
 */
exp.onUserEnter = function (uid, serverId, sessionId, player, cb) {
    //add event
    var playerObj = new Player(player);
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

    exp.attachmentHandle(playerObj, cb);
}

/**
 * 重置登录后签到、补助、每日任务等信息
 * @param playerObj
 * @param cb
 */
exp.attachmentHandle = function (playerObj, cb) {
    //如果第一次登录, 无需任何处理;
    if (playerObj.properties.lastLoginAt == null) {
        playerObj.properties.lastLoginAt = new Date();
    }
    //如果上次登录不是今天，即今天第一次登录;（如果是今天，则说明已处理过，无需再处理）
    else if (!Date.equalsDay(new Date(playerObj.properties.lastLoginAt), Date.today())) {
        //清除领取今日奖励数据
        playerObj.clearGrantRecord();
        //设置连续签到数
        if (playerObj.properties.lastCheckIn != null) {
            //如果上次签到不是昨天, 说明不是连续签到了
            if (!Date.equalsDay(new Date(playerObj.properties.lastCheckIn), Date.yesterday())) {
                playerObj.properties.continuousCheckInNr = 0;
            }
            //如果连续签到一个周期, 则重置连续签到
            if (playerObj.properties.continuousCheckInNr == globals.checkIn.length) {
              playerObj.properties.continuousCheckInNr = 0;
            }
        }
        //设置本次登录时间
        playerObj.properties.lastLoginAt = new Date();
        //处理登录后每日任务等信息
        playerObj.initDailyTasks();
    }
    playerObj.saveAll();
    cb({player: playerObj});
}

/**
 * 当用户断开连接时，处理各种XX
 */
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
                logger.info("user-disconnect||%j||玩家掉线时还在游戏中, 用户ID:%j", data.uid, data.uid)
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


/**
 * 玩家胜利
 */
exp.win = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user-win||%j||玩家胜利, 但玩家不在缓存, 用户ID:%j", data.uid, data.uid);
            cb({code: Code.FAIL});
            return;
        }

        var player = user.player;
        player.win(data.roomId, data.gold, function (result) {
            player.save();
            //messageService.pushMessageToPlayer({
            //    uid: user.uid,
            //    sid: user.serverId
            //}, consts.EVENT.GOLD_CHANGE, {gold: result.gold});
            cb({code: Code.OK});
        });
    });
}

/**
 * 玩家失败
 */
exp.lose = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user-lose||%j||玩家失败, 但玩家不在缓存, 用户ID:%j", data.uid, data.uid);
            cb({code: Code.FAIL});
            return;
        }

        var player = user.player;
        player.lose(data.roomId, data.gold, function (result) {
            player.save();
            //messageService.pushMessageToPlayer({
            //    uid: user.uid,
            //    sid: user.serverId
            //}, consts.EVENT.GOLD_CHANGE, {gold: result.gold});
            cb({code: Code.OK});
        });
    });
}

/**
 * 平局
 */
exp.tie = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user-tie||%j||玩家失败, 但玩家不在缓存, 用户ID:%j", data.uid, data.uid);
            cb({code: Code.FAIL});
            return;
        }

        var player = user.player;
        player.tie(data.roomId, function (result) {
            player.save();
            cb({code: Code.OK});
        });
    });
}

/**
 * 游戏结束后处理xx
 */
exp.battle = function (detail, cb) {

    exp.getUserCacheByUid(detail.uid, function (user) {
        //处理结束后, 相关处理
        user.player.battle(detail.roomId, detail.result, {meeting: detail.meeting});
    });

    switch (detail.result) {
        case consts.GAME.ACTOR_RESULT.WIN:
            exp.win({uid: detail.uid, roomId: detail.roomId, gold: detail.gold}, function (data) {
            });
            break;
        case consts.GAME.ACTOR_RESULT.LOSE:
            exp.lose({uid: detail.uid, roomId: detail.roomId, gold: detail.gold * -1}, function (data) {
            });
            break;
        default:
            exp.tie({uid: detail.uid, roomId: detail.roomId}, function (data) {
            });
            break;
    }

    cb();
}

/**
 * 结算
 */
exp.balance = function (data, cb) {
    var details = data.details;
    var result = {code: Code.OK};

    //为防止结算未完成时，已将玩家从缓存中移除，所以需保证map结束后，再callback
    Promise.all(_.map(details, function (detail) {

        exp.battle(detail, function () {

        });

        return Promise.resolve;
    }))
        .then(cb(result))
        .done();
}

/**
 * 签到
 */
exp.getCheckInGrant = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user-check in||%j||玩家签到失败, 玩家不在缓存, 用户ID:%j", data.uid, data.uid);
            cb({code: Code.FAIL});
            return;
        }

        user.player.getCheckInGrant(cb);

    });
}

/**
 * 领取破产补助
 */
exp.getBankruptcyGrant = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user-grant||%j||玩家领取补助失败, 玩家不在缓存, 用户ID:%j", data.uid, data.uid);
            cb({code: Code.FAIL});
            return;
        }
        user.player.getBankruptcyGrant(cb);
    })
}

/**
 * 获得每日任务列表
 */
exp.getDailyTaskList = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user-task list||%j||玩家获取任务列表失败, 玩家不在缓存, 用户ID:%j", data.uid, data.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.TASK_GRANT.ERR});
            return;
        }
        cb({code: Code.OK, taskList: user.player.tasks.daily});
    })
}

/**
 * 获得系统任务列表
 */
exp.getForeverTaskList = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user-task list||%j||玩家获取任务列表失败, 玩家不在缓存, 用户ID:%j", data.uid, data.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.TASK_GRANT.ERR});
            return;
        }
        cb({code: Code.OK, taskList: user.player.tasks.forever});
    })
}


/**
 * 领取任务奖励
 */
exp.getTaskGrant = function (data, cb) {
    exp.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.info("user-task grant||%j||玩家领取任务奖励失败, 玩家不在缓存, 用户ID:%j", data.uid, data.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.TASK_GRANT.ERR});
            return;
        }
        user.player.getTaskGrant(data.taskId, cb);
    })
}

exp.addFragment = function (data, cb) {

}

exp.recharge = function (data, cb) {

}

/**
 * 通过uid获取缓存用户信息
 */
exp.getUserCacheByUid = function (uid, cb) {
    var u = _.findWhere(pomelo.app.userCache, {uid: uid});
    cb(u);
}

/**
 * 通过uids获取缓存用户信息集合
 */
exp.getUsersCacheByUids = function (data, cb) {
    var users = [];
    _.map(data.uids, function (uid) {
        var u = _.findWhere(pomelo.app.userCache, {uid: uid});
        users.push(u);
    });
    cb(users);
}

/**
 * 通过sessionId获取用户信息
 */
exp.getUserCacheBySessionId = function (sessionId, cb) {
    var u = _.findWhere(pomelo.app.userCache, {sessionId: sessionId});
    cb(u);
}

exp.getReceiverByUid = function (uid, cb) {

}

/**
 * 设置玩家的房间&游戏状态
 */
exp.setGameReference = function (uid, roomId, gameId, cb) {
    var user = _.findWhere(pomelo.app.userCache, {uid: uid});
    user.roomId = roomId;
    user.gameId = gameId;
    cb();
};

/**
 * 设置用户的sessionId
 */
exp.setUserSessionId = function (uid, sessionId) {
    var user = _.findWhere(pomelo.app.userCache, {uid: uid});
    user.sessionId = sessionId;
}

var userDao = require('../dao/userDao');
var _ = require('underscore');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.USER);
var Code = require('../../../shared/code');

var exp = module.exports;


exp.getUserInfo = function (uid, cb) {

    userDao.getUserById(uid, function (user) {
        cb(user);
    });

}


exp.onUserEnter = function (uid, serverId, sessionId, player, cb) {
    var u = _.findWhere(pomelo.app.userCache, {uid: uid});
    if (u)
    {
        u.serverId = serverId;
        u.sessionId = sessionId;
        u.player = player;
    }
    else
    {
        pomelo.app.userCache.push({uid: uid, serverId: serverId, sessionId: sessionId, roomId: null, gameId: null, player: player});
    }
    cb();
}

exp.onUserDisconnect = function (data, cb) {
    var u = _.findWhere(pomelo.app.userCache, {uid: data.uid});
    if (u.gameId)
    {
        pomelo.app.rpc.game.gameRemote.getGameStatusById(null, {roomId: u.roomId, gameId: u.gameId}, function (status) {
            //当玩家掉线时，并且玩家正在游戏中，则标识玩家为掉线，结算后再踢掉
            if (status != null &&  status != 3)
            {
                logger.info("user||disconnect||玩家掉线时还在游戏中, 用户ID:%j", data.uid)
                //set user session id = null.
                exp.setUserSessionId(data.uid, null);

            }
            else {
                //当玩家掉线时，并且玩家在牌桌中，牌局不是游戏中，执行玩家离开牌桌指令
                pomelo.app.rpc.game.gameRemote.leave(null, {uid: data.uid}, function (data) {
                    if (data.code == Code.FAIL) {
                        logger.info("game||leave||玩家掉线离开排钟失败, 用户ID:%j", data.uid)
                        cb();
                        return;
                    }
                    pomelo.app.userCache = _.without(pomelo.app.userCache, u);
                    delete u;
                });
            }
            cb();

        })
    }
    else {
        pomelo.app.userCache = _.without(pomelo.app.userCache, u);
        cb();
    }

}

exp.getUserCacheByUid = function (uid, cb) {
    var u = _.findWhere(pomelo.app.userCache, {uid: uid});
    cb(u);
}

exp.getUserCacheBySessionId = function (sessionId, cb) {
    var u = _.findWhere(pomelo.app.userCache, {sessionId: sessionId});
    cb(u);
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
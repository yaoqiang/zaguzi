var Code = require('../../../../../shared/code');
var userDao = require('../../../dao/userDao');
var async = require('async');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var gameUtil = require('../../../util/gameUtil');
var rooms = require('../../../../config/data/room');
var playerService = require('../../../services/playerService');
var logger = require('pomelo-logger').getLogger(__filename);
var consts = require('../../../consts/consts');

var schedule = require('pomelo-scheduler');

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
    if (!this.app)
        logger.error(app);
};

var handler = Handler.prototype;

/**
 * 登录成功后，进入游戏
 * @param msg
 * @param session
 * @param next
 */
handler.enter = function (msg, session, next) {

    msg.serverId = this.app.get('serverId');
    var uid = msg.uid, token = msg.token, self = this;

    var sessionService = self.app.get('sessionService');


    if (!token) {
        next(new Error('invalid entry request: empty token'), {code: Code.FAIL});
        return;
    }

    var player;

    async.waterfall([
        function (cb) {
            // auth token
            self.app.rpc.auth.authRemote.auth(session, token, cb);
        }, function (code, user, cb) {
            // query player info by user id
            if (code !== Code.OK) {
                next(null, {code: code});
                return;
            }

            if (!user) {
                next(null, {code: Code.ENTRY.FA_USER_NOT_EXIST});
                return;
            }

            uid = user.id;
            userDao.getPlayerByUid(uid, cb);
        }, function (res, cb) {
            if (res != null) {
                cb(null, res);
            }
            else {
                userDao.createPlayer(uid, cb);
            }
        }, function (res, cb) {
            player = res;
            session.bind(uid);
            session.set('serverId', msg.serverId);
            session.on('closed', onUserDisconnect.bind(null, self.app));
            session.pushAll(cb);
        }], function (err) {
        if (err) {
            next(err, {code: Code.FAIL});
            return;
        }

        self.app.rpc.manager.userRemote.getUserCacheByUid(session, uid, function (u) {

            //如果用户在线
            if (u && !!u.sessionId) {
                //如果用户在牌局中
                if (!!u.gameId) {
                    //查询牌局状态
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
                        //玩家在游戏中，通知客户端需发送重回游戏指令；
                        if (game.gameLogic != null && game.gameLogic.currentPhase != consts.GAME.PHASE.OVER) {
                            logger.debug("user||玩家重新登录后, 玩家状态还在游戏中, 发送重回游戏消息, 用户ID:%j", u.uid)
                            if (_.isNull(u.sessionId)) {

                            }
                            else {

                            }
                        }
                        //否则给原连接发送被T下线消息，踢掉原连接，再执行当前连接onUserEnter
                        else {

                        }
                    });

                }
                sessionService.kickBySessionId(u.sessionId, null);

            }
        });

        self.app.rpc.manager.userRemote.onUserEnter(session, {
            uid: uid,
            serverId: msg.serverId,
            sessionId: session.id,
            player: player
        }, function () {
            next(null, {code: Code.OK, player: player});

        });
    });

};


handler.enterLobby = function (msg, session, next) {
    var lobbyId = msg.lobbyId;
    next(null, {code: Code.OK, rooms: rooms[lobbyId]});
};


var onUserDisconnect = function (app, session, reason) {
    if (session.uid == undefined) {
        return;
    }

    app.rpc.manager.userRemote.onUserDisconnect(null, {roomId: session.settings.roomId, uid: session.uid}, function () {

    });

};

var Code = require('../../../../../shared/code');
var userDao = require('../../../dao/userDao');
var async = require('async');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var gameUtil = require('../../../util/gameUtil');
var rooms = require('../../../../config/data/room');
var messageService = require('../../../services/messageService');
var consts = require('../../../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.GAME);
var pomelo = require('pomelo');
var _ = require('lodash');

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

    var player, userData;

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

            userData = user;

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
            cb();
        }], function (err) {
        if (err) {
            next(err, {code: Code.FAIL});
            return;
        }

        self.app.rpc.manager.userRemote.getUserCacheByUid(session, uid, function (u) {

            //!!u.sessionId
            //如果用户在线
            if (u) {
                //如果玩家在线, 用缓存中的用户数据覆盖从DB中查出的结果（考虑缓存中数据没有及时写入DB情况）
                player = u.player;
                //如果玩家是正常在线, 则不允许登录
                if (!!u.sessionId) {
                    next(null, {code: Code.FAIL, message: '用户已登录'});
                    //sessionService.kickBySessionId(session.id, null);
                    return;
                }
                //如果玩家是掉线状态,并且用户在牌局中
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
                            logger.debug("user||玩家掉线重新登录后, 玩家状态还在游戏中, 发送重回游戏消息, 用户ID:%j", u.uid);

                            session.bind(uid);
                            session.set('serverId', msg.serverId);
                            session.on('closed', onUserDisconnect.bind(null, self.app));
                            session.pushAll();

                            next(null, {code: Code.OK, player: player, isBackGame: true});

                            //u.sessionId = session.id;
                            pomelo.app.rpc.manager.userRemote.setUserSessionId(null, u.uid, session.id, function () {

                            });

                            logger.debug("向游戏服务器查询游戏信息并返回-掉线状态");

                            //查询牌局状态
                            //rpc invoke
                            var getStatusDetailsParams = {
                                namespace: 'user',
                                service: 'gameRemote',
                                method: 'getGameStatusDetailsById',
                                args: [{
                                    uid: uid,
                                    gameId: u.gameId
                                }]
                            };

                            pomelo.app.rpcInvoke(room.serverId, getStatusDetailsParams, function (gameDetails) {
                                messageService.pushMessageToPlayer({
                                    uid: uid,
                                    sid: msg.serverId
                                }, consts.EVENT.BACK_TO_GAME, gameDetails)
                            });


                        }
                    });
                }
            }
            //玩家不在线
            else {
                session.bind(uid);
                session.set('serverId', msg.serverId);
                session.on('closed', onUserDisconnect.bind(null, self.app));
                session.pushAll();
                self.app.rpc.manager.userRemote.onUserEnter(session, {
                    uid: uid,
                    serverId: msg.serverId,
                    sessionId: session.id,
                    player: player
                }, function (data) {
                    next(null, {code: Code.OK, player: generateSimplePlayerResponse(data.player, userData)});
                });
            }
        });
    });

};

handler.enterIndex = function (msg, session, next) {
    this.app.rpc.manager.userRemote.getOnlineUserResultCache(null, {}, function (data) {
        next(null, {code: Code.OK, onlineLobby: data.online.lobby})
    });
}


handler.enterLobby = function (msg, session, next) {
    var lobbyId = msg.lobbyId;
    var self = this;
    self.app.rpc.manager.userRemote.getOnlineUserResultCache(null, {}, function (data) {
        var roomsResult = _.map(rooms[lobbyId], function (room) {
            _.each(data.online.room, function (onlineRoom) {
                if (onlineRoom.id == room.id) {
                    room.online = onlineRoom.online;
                }
            });
            return room;
        });

        next(null, {code: Code.OK, rooms: roomsResult});

    });

};


var onUserDisconnect = function (app, session, reason) {
    if (session.uid == undefined) {
        return;
    }

    app.rpc.manager.userRemote.onUserDisconnect(null, {roomId: session.settings.roomId, uid: session.uid}, function () {

    });

};

var generateSimplePlayerResponse = function (player, userData) {
    return {
        uid: player.uid,
        nickName: player.nickName,
        gender: player.gender,
        avatar: player.avatar,
        gold: player.gold,
        winNr: player.winNr,
        loseNr: player.loseNr,
        tieNr: player.tieNr,
        rank: player.rank,
        exp: player.exp,
        fragment: player.fragment,
        meetingTimes: player.meetingTimes,
        properties: player.properties,
        user: {
            username: userData.username,
            mobile: userData.mobile
        }
    }
}
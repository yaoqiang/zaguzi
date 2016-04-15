var Code = require('../../../../../shared/code');
var userDao = require('../../../dao/userDao');
var async = require('async');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var gameUtil = require('../../../util/gameUtil');
var rooms = require('../../../../config/data/room');
var messageService = require('../../../services/messageService');
var consts = require('../../../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.GAME);
var loggerLogin = require('log4js').getLogger(consts.LOG.LOGIN_RECORD);
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

            pomelo.app.rpc.manager.userRemote.getUserCacheByUid(session, uid, function (u) {

            //u: 缓存用户状态
            //如果用户在线
            if (u) {
                //如果玩家在线, 用缓存中的用户数据覆盖从DB中查出的结果（考虑缓存中数据没有及时写入DB情况）
                player = u.player;

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
                            logger.debug("user||玩家重新登录后, 玩家状态还在游戏中, 发送重回游戏消息, 用户ID:%j", u.uid);

                            //isBackGame: true, 为客户端处理页面逻辑需要而提供
                            next(null, {code: Code.OK, player: player, isBackGame: true});

                            //如果玩家正常在线, 并且在游戏中, 则先踢掉原用户, 再发送重回游戏Event
                            if (!!u.sessionId) {

                                //先手动执行用户断线后逻辑, 确保新登录用户处理登录后逻辑在前者执行完成后
                                doUserDisconnect(self.app, u.uid, function () {

                                    sessionService.kickBySessionId(u.sessionId, consts.GLOBAL.KICK_REASON.ANOTHER_LOGIN, function () {
                                        session.bind(uid);
                                        session.set('serverId', msg.serverId);
                                        session.on('closed', onUserDisconnect.bind(null, self.app));
                                        session.pushAll();

                                        pomelo.app.rpc.manager.userRemote.setUserSessionId(null, u.uid, session.id, function () {
                                            sendBackGameEvent(uid, u, room, msg);
                                        });
                                        self.app.rpc.chat.chatRemote.add(session, player.uid, player.nickName, channelUtil.getGlobalChannelName(), function () {
                                        });
                                    });
                                });
                            }
                            else {
                                //如果玩家掉线, 设置新的sessionId(在gameLogic逻辑处理中,如果掉线不会立即清空用户缓存,
                                // 而会将sessionId设置为undefined or null, 结束后结算完才清空)
                                session.bind(uid);
                                session.set('serverId', msg.serverId);
                                session.on('closed', onUserDisconnect.bind(null, self.app));
                                session.pushAll();

                                pomelo.app.rpc.manager.userRemote.setUserSessionId(null, u.uid, session.id, function () {
                                    sendBackGameEvent(uid, u, room, msg);
                                });
                                self.app.rpc.chat.chatRemote.add(session, player.uid, player.nickName, channelUtil.getGlobalChannelName(), function () {
                                });
                            }

                        }
                        else {
                            //如果玩家是正常在线, 并且在牌桌, 但是没有开始游戏, 则踢掉
                            if (!!u.sessionId) {
                                //先手动执行用户断线后逻辑, 确保新登录用户处理登录后逻辑在前者执行完成后
                                doUserDisconnect(self.app, u.uid, function () {

                                    //
                                    sessionService.kickBySessionId(u.sessionId, consts.GLOBAL.KICK_REASON.ANOTHER_LOGIN, function () {
                                        onUserEnter(session, uid, msg, self, player, userData, next);
                                    });
                                });

                            }
                        }
                    });
                }
                else {
                    //如果玩家是正常在线, 则踢掉
                    if (!!u.sessionId) {
                        doUserDisconnect(self.app, u.uid, function () {

                            sessionService.kickBySessionId(u.sessionId, consts.GLOBAL.KICK_REASON.ANOTHER_LOGIN, function () {
                                onUserEnter(session, uid, msg, self, player, userData, next);
                            });
                        });
                    }
                }
            }
            //玩家不在线
            else {
                onUserEnter(session, uid, msg, self, player, userData, next);
            }
        });
    });

};

function onUserEnter(session, uid, msg, self, player, userData, next) {
    session.bind(uid);
    session.set('serverId', msg.serverId);
    session.on('closed', onUserDisconnect.bind(null, self.app));
    session.pushAll();

    var sessionService = self.app.get('sessionService');
    var remoteAddress = sessionService.getClientAddressBySessionId(session.id);

    var ip = '127.0.0.1';
    try {
        if (remoteAddress && remoteAddress.ip) ip = remoteAddress.ip.substring(7, remoteAddress.ip.length);
    } catch (e) {
    }

    //记录登录日志
    loggerLogin.info('%j', {uid: uid, serverId: msg.serverId, ip: ip, os: msg.os || 'unknown', date: new Date()});

    self.app.rpc.chat.chatRemote.add(session, player.uid, player.nickName, channelUtil.getGlobalChannelName(), function () {
    });

    self.app.rpc.manager.userRemote.onUserEnter(session, {
        uid: uid,
        serverId: msg.serverId,
        sessionId: session.id,
        player: player
    }, function (data) {
        next(null, {code: Code.OK, player: generateSimplePlayerResponse(data.player, userData)});
    });
}

function sendBackGameEvent(uid, u, room, msg) {
    //查询牌局状态,     rpc invoke
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
            if (!!data.online) {
                _.each(data.online.room, function (onlineRoom) {
                    if (onlineRoom.id == room.id) {
                        room.online = onlineRoom.online;
                    }
                });
                return room;
            }
            else {
                room.online = 0;
            }

        });

        next(null, {code: Code.OK, rooms: roomsResult});

    });

};


handler.ping = function (msg, session, next) {
    next(null, {code: Code.OK});
};


var onUserDisconnect = function (app, session, reason) {
    //如果session.uid已不存在, 则不处理; 目前使用场景是, 如果被踢下线, 手动处理了kick流程, 并且原session.uid会被设置为undefined
    if (_.isNull(session.uid) || _.isUndefined((session.uid))) {
        return;
    }

    doUserDisconnect(app, session.uid, function () {

    });

    //chat
    app.rpc.chat.chatRemote.kick(session, session.uid, null);

};

var doUserDisconnect = function (app, uid, cb) {
    app.rpc.manager.userRemote.onUserDisconnect(null, {uid: uid}, function () {
        cb();
    });

}

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
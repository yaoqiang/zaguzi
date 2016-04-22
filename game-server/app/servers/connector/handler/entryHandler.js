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
var loggerErr = require('log4js').getLogger(consts.LOG.ERROR);
var pomelo = require('pomelo');
var _ = require('lodash');

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
    if (!this.app)
        loggerErr.error(app);
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
            sessionService.kick(uid, cb);
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
                //gameId的赋值是null, roomId的赋值也是null
                if (u.gameId) {
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

                            //绑定新session
                            session.bind(uid);
                            session.set('serverId', msg.serverId);
                            session.on('closed', onUserDisconnect.bind(null, self.app));
                            session.pushAll();

                            loggerErr.debug('%j', {method: "connector.entryHandler.entry-1", uid: u.uid, originalSessionId: u.sessionId, sessionId: session.id, desc: '玩家entry时, 在游戏中, 并且已在其他设备登录 -- 设置新sessionId开始'});
                            //原用户还在缓存, 直接设置新的sessionId（恢复连接）
                            pomelo.app.rpc.manager.userRemote.setUserSessionId(null, u.uid, session.id, function () {
                                loggerErr.debug('%j', {method: "connector.entryHandler.entry-1", uid: u.uid, originalSessionId: u.sessionId, sessionId: session.id, desc: '玩家entry时, 在游戏中, 并且已在其他设备登录 -- 设置新sessionId成功'});
                                sendBackGameEvent(uid, u, room, msg);
                            });
                            self.app.rpc.chat.chatRemote.add(session, player.uid, player.nickName, channelUtil.getGlobalChannelName(), function () {
                            });

                        }
                        else {
                            //如果玩家是正常在线, 并且在牌桌
                            loggerErr.debug('%j', {method: "connector.entryHandler.entry-5", uid: uid, sessionId: session.id, desc: '玩家entry时, 正常在线, 并且在牌桌'});
                            onUserEnter(session, uid, msg, self, player, userData, next);
                        }
                    });
                }
                else {
                    //如果玩家是正常在线
                    loggerErr.debug('%j', {method: "connector.entryHandler.entry-5", uid: uid, sessionId: session.id, desc: '玩家entry时, 正常在线'});
                    onUserEnter(session, uid, msg, self, player, userData, next);
                }
            }
            //玩家不在线
            else {
                loggerErr.debug('%j', {method: "connector.entryHandler.entry-5", uid: uid, sessionId: session.id, desc: '玩家entry时, 不在线'});
                onUserEnter(session, uid, msg, self, player, userData, next);
            }
        });
    });

};

//session断开自动触发
var onUserDisconnect = function (app, session, reason) {
    //如果session.uid已不存在, 则不处理; 目前使用场景是, 如果被踢下线, 手动处理了kick流程, 并且原session.uid会被设置为undefined
    loggerErr.debug('%j', {method: "connector.entryHandler.onUserDisconnect-1", uid: session.uid, sessionId: session.id, reason: reason, desc: '连接断开时(网络断开或kick),处理玩家状态-开始'});
    if (_.isNull(session.uid) || _.isUndefined(session.uid)) {
        loggerErr.debug('%j', {method: "connector.entryHandler.onUserDisconnect-2", uid: session.uid, sessionId: session.id, reason: reason, desc: '连接断开时(网络断开或kick),已处理过玩家状态'});
        return;
    }

    var uid = session.uid;

    doUserDisconnect(app, session.uid, function () {
        loggerErr.debug('%j', {method: "connector.entryHandler.onUserDisconnect-3", uid: uid, sessionId: session.id, reason: reason, desc: '连接断开时(网络断开或kick),处理玩家状态-结束'});
    });

    //chat
    app.rpc.chat.chatRemote.kick(session, uid, null);

};

//实际执行断开逻辑（处理用户状态）
var doUserDisconnect = function (app, uid, cb) {
    app.rpc.manager.userRemote.onUserDisconnect(null, {uid: uid}, function () {
        cb();
    });
}

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
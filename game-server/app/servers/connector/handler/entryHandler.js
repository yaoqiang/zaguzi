var Code = require('../../../../../shared/code');
var userDao = require('../../../dao/userDao');
var async = require('async');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var rooms = require('../../../../config/data/room');
var playerService = require('../../../services/playerService');
var logger = require('pomelo-logger').getLogger(__filename);

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

            //如果用户正常在线，踢掉原连接
            if (u && !!u.sessionId) {
                //
                sessionService.kickBySessionId(u.sessionId, null);

            }

            self.app.rpc.manager.userRemote.onUserEnter(session, {
                uid: uid,
                serverId: msg.serverId,
                sessionId: session.id,
                player: player
            }, function () {
                next(null, {code: Code.OK, player: player});
            });

            //如果用户在游戏中，则告诉客户端需发送重回游戏指令
            if (u && !!u.gameId) {

            }

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

var Code = require('../../../../../shared/code');
var async = require('async');
var utils = require('../../../util/utils');
var rooms = require('../../../../config/data/room');
var consts = require('../../../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.GAME);
var _ = require('lodash');
var pomelo = require('pomelo');

var messageService = require('../../../services/messageService');

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
    if (!this.app)
        logger.error(app);
};

var handler = Handler.prototype;



/////////////////////////
// 只处理牌局相关
////////////////////////
handler.join = function (msg, session, next) {
    msg.sid = session.get('serverId');
    msg.uid = session.uid;
    msg.sessionId = session.id;

    var roomId = msg.roomId, self = this;

    // join game
    self.app.rpc.game.gameRemote.join(session, msg, function (data) {
        if (data.code === Code.FAIL)
        {
            next(null, {code: Code.FAIL, err: data.err});
            return;
        }

        session.set('roomId', roomId);
        session.set('gameId', data.gameId);
        session.pushAll();

        next(null, {code: Code.OK, lobbyId: data.lobbyId, roomId: data.roomId, gameId: data.gameId, gameType: data.gameType, base: data.base, actors: data.actors});
    });

};

handler.ready = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.game.gameRemote.ready(session, msg, function (data) {
        if (data.code === Code.FAIL)
        {
            next(null, {code: Code.FAIL, err: data.err});
            return;
        }
        next(null, {code: Code.OK})
    });
};

handler.talk = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.game.gameRemote.talk(session, msg, function (data) {
        if (data.code === Code.FAIL)
        {
            next(null, {code: Code.FAIL, err: data.err});
            return;
        }
        next(null, {code: Code.OK,goal: data.goal,
            append: data.append,
            share: data.share})
    })
};

handler.fan = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.game.gameRemote.fan(session, msg, function (data) {
        if (data.code === Code.FAIL)
        {
            next(null, {code: Code.FAIL, err: data.err});
            return;
        }
        next(null, {code: Code.OK, cards: data.cards, cardRecognization: data.cardRecognization})
    })
};

handler.trusteeship = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.game.gameRemote.trusteeship(session, msg, function (data) {
        if (data.code === Code.FAIL)
        {
            next(null, {code: Code.FAIL, err: data.err});
            return;
        }
        next(null, {code: Code.OK})
    })
};

handler.cancelTrusteeship = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.game.gameRemote.cancelTrusteeship(session, msg, function (data) {
        if (data.code === Code.FAIL)
        {
            next(null, {code: Code.FAIL, err: data.err});
            return;
        }
        next(null, {code: Code.OK})
    })
};

handler.leave = function (msg, session, next) {
    msg.uid = session.uid;

    // leave game
    this.app.rpc.game.gameRemote.leave(session, msg, function (data) {
        next(null, data);
    });
};


var Code = require('../../../../../shared/code');
var async = require('async');
var utils = require('../../../util/utils');
var rooms = require('../../../../config/data/room');
var consts = require('../../../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.GAME);
var loggerErr = require('log4js').getLogger(consts.LOG.ERROR);
var _ = require('lodash');
var pomelo = require('pomelo-rt');

var messageService = require('../../../services/messageService');

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
    if (!this.app)
        loggerErr.error(app);
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

        //1.2之前场次分类根据5、6、7人场 -> 底注
        //1.3场次分类根据普通、元宝、私人...

        //为满足1.2版, rooms依旧通过数组下表查找, 1.3后就是通过lobbyId来找.
        //因在1.3版去掉了1.2版的500底注和2000底注, 在Join后, 会得到1.3版room.json的响应结果, 导致lobbyId混乱.(客户端根据lobbyId决定退回路径)
        //所以约定1.2版Join时返回的lobbyId=-1转换为之前的lobbyId=0, lobbyId=-2的转为lobbyId=1, lobbyId=-3的转为lobbyId=2, 
        if (data.lobbyId == -1) data.lobbyId = 0;
        if (data.lobbyId == -2) data.lobbyId = 1;
        if (data.lobbyId == -3) data.lobbyId = 2;

        //元宝场处理方式
        if (data.roomId == 13) data.lobbyId = 0;
        if (data.roomId == 23) data.lobbyId = 1;
        if (data.roomId == 33) data.lobbyId = 2;

        next(null, {code: Code.OK, lobbyId: data.lobbyId, roomId: data.roomId, gameId: data.gameId, gameType: data.gameType, base: data.base, actors: data.actors});
    });

};

handler.join_v_1_3 = function (msg, session, next) {
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

/**
 * 五人局双三认输
 */
handler.giveUp = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.game.gameRemote.giveUp(session, msg, null);
    next();
};

handler.leave = function (msg, session, next) {
    msg.uid = session.uid;

    // leave game
    this.app.rpc.game.gameRemote.leave(session, msg, function (data) {
        next(null, data);
    });
};

/**
 * 创建私人房间
 * msg: {maxActor: Int, name: String, password: String, base: Int, useNoteCard: true/false/null}
 */
handler.createPrivateGame = function (msg, session, next) {
    msg.sid = session.get('serverId');
    msg.uid = session.uid;
    msg.sessionId = session.id;
    this.app.rpc.game.gameRemote.createPrivateGame(session, msg, function (data) {
        next(null, data);
    });
}

handler.listPrivateGame = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.game.gameRemote.listPrivateGame(session, msg, function (data) {
        next(null, data);
    });
}

handler.joinPrivateGame = function (msg, session, next) {
    msg.sid = session.get('serverId');
    msg.uid = session.uid;
    msg.sessionId = session.id;
    this.app.rpc.game.gameRemote.joinPrivateGame(session, msg, function (data) {
        next(null, data);
    });
}

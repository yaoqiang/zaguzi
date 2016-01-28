var Code = require('../../../../../shared/code');
var async = require('async');
var utils = require('../../../util/utils');
var rooms = require('../../../../config/data/room');
var consts = require('../../../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.GAME);
var _ = require('lodash');
var pomelo = require('pomelo');
var compareVersions = require('compare-versions');
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
// 牌局相关
////////////////////////
handler.join = function (msg, session, next) {
    msg.sid = session.get('serverId');
    msg.uid = session.uid;

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



///////////////////////////
// 游戏内其他附加功能相关
///////////////////////////

/**
 * 更新个人信息
 * @param msg
 * @param session
 * @param next
 */
handler.updateProfile = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.manager.userRemote.updateProfile(session, msg, function (data) {
        next(null, data);
    });
}

handler.getDailyTodoInfo = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.manager.userRemote.getDailyTodoInfo(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 领取签到奖励
 * @param msg
 * @param session
 * @param next
 */
handler.getCheckInGrant = function (msg, session, next) {
    msg.uid = session.uid;
    //
    this.app.rpc.manager.userRemote.getCheckInGrant(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 领取破产补助
 * @param msg
 * @param session
 * @param next
 */
handler.getBankruptcyGrant = function (msg, session, next) {
    msg.uid = session.uid;
    //
    this.app.rpc.manager.userRemote.getBankruptcyGrant(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 获得每日任务列表
 * @param msg
 * @param session
 * @param next
 */
handler.getDailyTaskList = function (msg, session, next) {
    msg.uid = session.uid;
    //
    this.app.rpc.manager.userRemote.getDailyTaskList(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 获得系统任务列表
 * @param msg
 * @param session
 * @param next
 */
handler.getForeverTaskList = function (msg, session, next) {
    msg.uid = session.uid;
    //
    this.app.rpc.manager.userRemote.getForeverTaskList(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 领取任务奖励
 * @param msg
 * @param session
 * @param next
 */
handler.getTaskGrant = function (msg, session, next) {
    msg.uid = session.uid;
    //
    this.app.rpc.manager.userRemote.getTaskGrant(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 获得商城列表
 * @param msg
 * @param session
 * @param next
 */
handler.getShopList = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.game.gameRemote.getShopList(session, msg, function (data) {
        if (data.code === Code.FAIL)
        {
            next(null, {code: Code.FAIL, err: data.err});
            return;
        }
        next(null, {code: Code.OK, shopList: data.shopList});
    })
}

/**
 * 获得我的物品列表
 * @param msg
 * @param session
 * @param next
 */
handler.getMyItemList = function (msg, session, next) {
    msg.uid = session.uid;
    //
    this.app.rpc.manager.userRemote.getMyItemList(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 获得兑换列表
 * @param msg
 * @param session
 * @param next
 */
handler.getExchangeList = function (msg, session, next) {
    msg.uid = session.uid;
    //
    this.app.rpc.manager.userRemote.getExchangeList(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 获得我的兑换记录
 * @param msg
 * @param session
 * @param next
 */
handler.getMyExchangeRecordList = function (msg, session, next) {
    msg.uid = session.uid;
    //
    this.app.rpc.manager.userRemote.getMyExchangeRecordList(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 兑换
 * @param msg
 * @param session
 * @param next
 */
handler.exchange = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.manager.userRemote.exchange(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 获得排行榜
 * @param msg
 * @param session
 * @param next
 */
handler.getRankingList = function (msg, session, next) {
    this.app.rpc.manager.universalRemote.getRankingList(session, msg, function (data) {
        next(null, data);
    });
}

/**
 * 获得最新版本信息
 * @param msg
 * @param session
 * @param next
 */
handler.getTopOfAppReleaseRecord = function (msg, session, next) {
    msg.sid = session.get('serverId');
    msg.uid = session.uid;

    this.app.rpc.manager.universalRemote.getTopOfAppReleaseRecord(session, msg, function (data) {
        //a < b = -1, a == b: 0, a > b = 1;
        var result = compareVersions(msg.version, data.version);
        //如果客户端版本不是最新，则发送更新Event
        if (result == -1) {
            messageService.pushMessageToPlayer(msg.uid, consts.EVENT.VERSION_UPGRADE, data.summary);
        }
    });
}
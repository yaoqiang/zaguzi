var Code = require('../../../../../shared/code');
var async = require('async');
var utils = require('../../../util/utils');
var consts = require('../../../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.NORMAL);
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

///////////////////////////
// 游戏其他附加功能相关
///////////////////////////

handler.getProfile = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.manager.userRemote.getProfileByUid(session, msg, function (data) {

        var profile = {};
        if (!_.isUndefined(data)) {
            profile.nickName = data.player.nickName;
            profile.avatar = data.player.avatar;
            profile.gender = data.player.gender;
            profile.winNr = data.player.winNr;
            profile.tieNr = data.player.tieNr;
            profile.loseNr = data.player.loseNr;
            profile.gold = data.player.gold;
            profile.fragment = data.player.fragment;
            profile.meetingTimes = data.player.meetingTimes;
            profile.summary = data.player.summary;
            profile.mobile = data.userInfo ? data.userInfo.mobile : undefined;
        }
        next(null, profile);
    });
}

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

/**
 * 
 * @param msg
 * @param session
 * @param next
 */
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
    this.app.rpc.manager.universalRemote.getExchangeList(session, msg, function (data) {
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
    this.app.rpc.manager.universalRemote.getMyExchangeRecordList(session, msg, function (data) {
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
    this.app.rpc.manager.universalRemote.exchange(session, msg, function (data) {
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
 * 获得商城列表
 * @param msg
 * @param session
 * @param next
 */
handler.getShopList = function (msg, session, next) {
    msg.uid = session.uid;
    this.app.rpc.manager.universalRemote.getShopList(session, msg, function (data) {
        if (data.code === Code.FAIL)
        {
            next(null, {code: Code.FAIL, err: data.err});
            return;
        }
        next(null, {code: Code.OK, shopList: data.shopList});
    })
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

    this.app.rpc.manager.universalRemote.getTopOfAppReleaseRecord(session, msg, function () {
        
    });
}


////////////
//
///////////
handler.sendBindingSMS = function (msg, session, next) {
    msg.sid = session.get('serverId');
    msg.uid = session.uid;

    this.app.rpc.manager.universalRemote.sendBindingSMS(session, msg, function (data) {
        next(null, data);
    });
}

handler.bindingMobile = function (msg, session, next) {
    msg.sid = session.get('serverId');
    msg.uid = session.uid;

    this.app.rpc.manager.universalRemote.bindingMobile(session, msg, function (data) {
        next(null, data);
    });
}
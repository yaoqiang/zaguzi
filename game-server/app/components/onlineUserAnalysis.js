var _ = require('lodash');

var consts = require('../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.ONLINE_RECORD);

module.exports = function (app, opts) {
    return new OnlineUserAnalysis(app, opts);
};

//var DEFAULT_INTERVAL = 10000; // print cycle
var DEFAULT_INTERVAL = 60 * 1000 * 1; //scheduler setting

var OnlineUserAnalysis = function (app, opts) {
    this.app = app;
    this.interval = opts.interval | DEFAULT_INTERVAL;
    this.timerId = null;

};

OnlineUserAnalysis.name = '__OnlineUserAnalysis__';

OnlineUserAnalysis.prototype.start = function (cb) {
    var self = this;
    self.app.onlineUserResultCache = initOnlineState();
    this.timerId = setInterval(function () {
        //获取在线人数情况并将结果缓存在manager server;
        var result = getOnlineUserList(self.app.userCache);
        self.app.onlineUserResultCache = result;
        logger.info('%j', {createdAt: new Date(), data: result});
        //self.save(result);


    }, this.interval);
    process.nextTick(cb);
}

OnlineUserAnalysis.prototype.afterStart = function (cb) {
    process.nextTick(cb);
}

OnlineUserAnalysis.prototype.stop = function (force, cb) {
    clearInterval(this.timerId);
    process.nextTick(cb);
}


/////////////////
// 获取在线人数
/////////////////
var getOnlineUserList = function (userList) {

    if (userList == null || userList === undefined) {
        return initOnlineState();
    }

    var result = initOnlineState();
    result.total = userList.length;

    _.each(userList, function (user) {
        //lobby count
        //普通场
        if (user.roomId % 10 == 1) {
            result.lobby[0].online += 1;
        }
        //元宝场
        else if (user.roomId % 10 == 2) {
            result.lobby[1].online += 1;
        }
        //比赛场
        else if (user.roomId % 10 == 5) {
            result.lobby[2].online += 1;
        }
        //私人场
        else if (user.roomId % 10 == 6) {
            result.lobby[3].online += 1;
        }
        //room count
        switch (user.roomId) {
            case 11:
                result.room[0].online += 1;
                break;
            case 12:
                result.room[1].online += 1;
                break;
            case 13:
                result.room[2].online += 1;
                break;
            case 14:
                result.room[3].online += 1;
                break;
            case 21:
                result.room[4].online += 1;
                break;
            case 22:
                result.room[5].online += 1;
                break;
            case 23:
                result.room[6].online += 1;
                break;
            case 24:
                result.room[7].online += 1;
                break;
            case 31:
                result.room[8].online += 1;
                break;
            case 32:
                result.room[9].online += 1;
                break;
            case 33:
                result.room[10].online += 1;
                break;
            case 34:
                result.room[11].online += 1;
                break;
            case 45:
                result.room[12].online += 1;
                break;
            case 56:
                result.room[13].online += 1;
                break;
        }
    });
    return result;
}

//init online user;
var initOnlineState = function () {
    return {
        total: 0,
        lobby: [
            { id: 0, online: 0 },
            { id: 1, online: 0 },
            { id: 2, online: 0 },
            { id: 3, online: 0 }
        ],
        room: [
            { id: 11, online: 0 },
            { id: 12, online: 0 },
            { id: 13, online: 0 },
            { id: 14, online: 0 },
            { id: 21, online: 0 },
            { id: 22, online: 0 },
            { id: 23, online: 0 },
            { id: 24, online: 0 },
            { id: 31, online: 0 },
            { id: 32, online: 0 },
            { id: 33, online: 0 },
            { id: 34, online: 0 },
            { id: 45, online: 0 },
            { id: 56, online: 0 }
        ]
    }
}

OnlineUserAnalysis.prototype.save = function (result) {
    var bson = _.assign(_.omit(result, '_id'), { createdAt: new Date() });
    this.app.get('dbclient').onlineUserAnalysis.save(bson, function (err, doc) {
    })
}
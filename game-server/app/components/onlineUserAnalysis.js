var _ = require('lodash');

module.exports = function (app, opts) {
    return new OnlineUserAnalysis(app, opts);
};

//var DEFAULT_INTERVAL = 10000; // print cycle
var DEFAULT_INTERVAL = 60 * 1000 * 30; //scheduler setting

var OnlineUserAnalysis = function (app, opts) {
    this.app = app;
    this.interval = opts.interval | DEFAULT_INTERVAL;
    this.timerId = null;

    //init online user;
    this.initOnlineState = {
        total: 0,
        lobby: [
            {id: 0, online: 0},
            {id: 1, online: 0},
            {id: 2, online: 0}
        ],
        room: [
            {id: 11, online: 0},
            {id: 12, online: 0},
            {id: 13, online: 0},
            {id: 14, online: 0},
            {id: 21, online: 0},
            {id: 22, online: 0},
            {id: 23, online: 0},
            {id: 24, online: 0},
            {id: 31, online: 0},
            {id: 32, online: 0},
            {id: 33, online: 0},
            {id: 34, online: 0}
        ]
    }

};

OnlineUserAnalysis.name = '__OnlineUserAnalysis__';

OnlineUserAnalysis.prototype.start = function (cb) {
    var self = this;
    self.app.onlineUserResultCache = this.initOnlineState;
    this.timerId = setInterval(function () {
        //获取在线人数情况并将结果缓存在manager server;
        var result = self.getOnlineUserList();
        self.app.onlineUserResultCache = result;
        self.save(result);


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
OnlineUserAnalysis.prototype.getOnlineUserList = function () {
    var self = this;
    var userList = this.app.userCache;

    if (userList == null || userList === undefined) {
        return this.initOnlineState;
    }

    var result = _.reduce(userList, function (result, value) {

        return {
            total: result.total + 1,
            lobby: [
                {
                    id: result.lobby[0].id,
                    online: value.roomId > 0 && value.roomId < 20 ? result.lobby[0].online + 1 : result.lobby[0].online
                },
                {
                    id: result.lobby[1].id,
                    online: value.roomId > 20 && value.roomId < 30 ? result.lobby[1].online + 1 : result.lobby[1].online
                },
                {
                    id: result.lobby[2].id,
                    online: value.roomId > 30 && value.roomId < 40 ? result.lobby[2].online + 1 : result.lobby[2].online
                }
            ],
            room: [
                {
                    id: result.room[0].id,
                    online: value.roomId == result.room[0].id ? result.room[0].online + 1 : result.room[0].online
                },
                {
                    id: result.room[1].id,
                    online: value.roomId == result.room[1].id ? result.room[1].online + 1 : result.room[1].online
                },
                {
                    id: result.room[2].id,
                    online: value.roomId == result.room[2].id ? result.room[2].online + 1 : result.room[2].online
                },
                {
                    id: result.room[3].id,
                    online: value.roomId == result.room[3].id ? result.room[3].online + 1 : result.room[3].online
                },
                {
                    id: result.room[4].id,
                    online: value.roomId == result.room[4].id ? result.room[4].online + 1 : result.room[4].online
                },
                {
                    id: result.room[5].id,
                    online: value.roomId == result.room[5].id ? result.room[5].online + 1 : result.room[5].online
                },
                {
                    id: result.room[6].id,
                    online: value.roomId == result.room[6].id ? result.room[6].online + 1 : result.room[6].online
                },
                {
                    id: result.room[7].id,
                    online: value.roomId == result.room[7].id ? result.room[7].online + 1 : result.room[7].online
                },
                {
                    id: result.room[8].id,
                    online: value.roomId == result.room[8].id ? result.room[8].online + 1 : result.room[8].online
                },
                {
                    id: result.room[9].id,
                    online: value.roomId == result.room[9].id ? result.room[9].online + 1 : result.room[9].online
                },
                {
                    id: result.room[10].id,
                    online: value.roomId == result.room[10].id ? result.room[10].online + 1 : result.room[10].online
                },
                {
                    id: result.room[11].id,
                    online: value.roomId == result.room[11].id ? result.room[11].online + 1 : result.room[11].online
                }
            ],

        }
    }, self.initOnlineState);

    return result;

}

OnlineUserAnalysis.prototype.save = function (result) {
    this.app.get('dbclient').onlineUserAnalysis.save(_.assign(result, {createdAt: new Date()}), function (err, doc) {

    })
}
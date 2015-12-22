/**
 * Module dependencies
 */
var util = require('util');
var consts = require('../../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.USER, __filename);
var pomelo = require('pomelo');
var utils = require('../../util/utils');
var messageService = require('../../services/messageService');
var gameUtil = require('../../util/gameUtil');
var _ = require('underscore');
require('date-utils');

var Code = require('../../../../shared/code');

var Entity = require('./entity');
var ranks = require('../../../config/data/rank');
var roomConf = require('../../../config/data/room');
var itemConf = require('../../../config/data/item');
var taskConf = require('../../../config/data/task');
var globals = require('../../../config/data/globals');


var Player = function (opts) {
    Entity.call(this, opts);

    this.id = opts.id;
    this.nickName = opts.nickName;
    this.avatar = opts.avatar;
    this.gold = opts.gold;
    this.winNr = opts.winNr || 0;
    this.loseNr = opts.loseNr || 0;
    this.tieNr = opts.tieNr || 0;
    this.exp = opts.exp || 0;
    this.rank = opts.rank;
    this.fragment = opts.fragment;
    this.uid = opts.uid;
    this.items = opts.items;
    this.tasks = opts.tasks;
    this.properties = opts.properties;
    this.createdAt = opts.createdAt;

}

util.inherits(Player, Entity);

Player.prototype.updateProfile = function (data, cb) {

    this.nickName = data.nickName;
    this.avatar = data.avatar;

    logger.info("profile-update||%j||用户修改了个人基本信息，用户ID:%j", this.uid, this.uid);
    this.save();
    cb();
}

Player.prototype.addGold = function (type, gold, cb) {

    logger.info("gold-add||%j||用户通过[%j]获得了[%j]金币，用户ID:%j", this.uid, type, gold, this.uid);
    this.gold += gold;

    this.gold = this.gold < 0 ? 0 : this.gold;

    cb({gold: this.gold});

}

Player.prototype.payTax = function (roomId) {

    //税费规则

    var room = gameUtil.getRoomById(roomId);

    var gold = room.fax * -1;

    logger.info("gold-add||%j||用户游戏结束扣除[%j]金币税，用户ID:%j", this.uid, gold, this.uid);
    this.gold += gold;

    this.gold = this.gold < 0 ? 0 : this.gold;

}

Player.prototype.win = function (roomId, gold, cb) {
    this.winNr += 1;
    this.payTax(roomId);
    this.addExp(2, {roomId: roomId});
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.BATTLE, gold, cb);
}

Player.prototype.lose = function (roomId, gold, cb) {
    this.loseNr += 1;
    this.payTax(roomId);
    this.addExp(0, {roomId: roomId});
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.BATTLE, gold, cb);
}

Player.prototype.tie = function (roomId, cb) {
    this.tieNr += 1;
    this.payTax(roomId);
    this.addExp(1, {roomId: roomId});
    cb({gold: this.gold});

}

Player.prototype.addFragment = function (type, fragment, cb) {
    logger.info("fragment-add||%j||用户通过[%j]获得了[%j]元宝，用户ID:%j", this.uid, type, fragment, this.uid);
    this.fragment += fragment;
}

Player.prototype.addExp = function (exp, args) {

    this.exp += exp;

    var rank = _.findWhere(ranks, {rank: this.rank});
    if (this.exp > rank.exp) {
        this.upgrade();
    }
}

//        id, 个数/天数, 类型
// item: {id: Int, v: Int, m: String}
Player.prototype.addItem = function (type, item) {
    if (!_.isObject(item)) {
        logger.error('items-add||%j||玩家通过[%j]获得物品[%j] [%j]个/天失败[参数错误],用户ID:%j', this.uid, type, item.value, this.uid);
        return false;
    }

    //查找物品是否在配置表中
    var data = _.findWhere(itemConf, {id: item.id});

    if (_.isUndefined(data)) {
        logger.error('items-add||%j||玩家通过[%j]获得物品[%j] [%j]个/天失败[参数错误],用户ID:%j', this.uid, type, item.value, this.uid);
        return false;
    }

    //查询玩家是否有该物品
    var i = _.findWhere(this.items, {id: item.id});
    logger.info("items-add||%j||玩家通过[%j]获得物品[%j] [%j]个/天,用户ID:%j", this.uid, type, item.value, this.uid);
    var value;
    var now = new Date();
    //如果玩家没有该物品, 则添加; 否则叠加
    if (_.isUndefined(i)) {
        if (data.mode == consts.GLOBAL.ITEM_MODE.TERM) {
            value = now.add({days: item.value});
        }
        else {
            value = item.value;
        }
    } else {
        if (data.mode == consts.GLOBAL.ITEM_MODE.TERM) {
            //如果已过期, 则从现在叠加
            if (i.value.isBefore(now)) {
                value = now.add({days: item.value});
            } else {
                value = i.value.add({days: item.value});
            }
        }
        else {
            value = i.value + item.value;
        }
    }
    this.items.push({id: i.id, name: i.name, title: i.title, value: value, mode: data.mode});
    return true;
}

/**
 * 添加物品
 * @param type
 * @param items
 * @param cb
 */
Player.prototype.addItems = function (type, items, cb) {
    var self = this;
    var result = _.map(items, function (item) {
        return self.addItem(type, item);
    });

    if (_.contains(result, false)) {
        cb({code: Code.FAIL, err: '添加物品失败'});
        return;
    }
    cb({code: Code.OK});
}

Player.prototype.exist = function (item) {
    if (_.isNull(this.items) || _.isUndefined(this.items)) {
        return false;
    }

    if (!_.isArray(this.items)) {
        return false;
    }

    if (this.items.length <= 0) {
        return false;
    }

    var exist = _.findWhere(this.items, {id: item.id});

    return !_.isUndefined(exist);
}

Player.prototype.isExpired = function (k, cb) {

}

Player.prototype.consumeItem = function (type, item) {
    //查询玩家是否有该物品
    var i = _.findWhere(this.items, {id: item.id});
    if (_.isUndefined(i)) {
        logger.error('items-consume||%j||玩家通过[%j]消耗物品[%j] [%j]个/天失败[玩家没有该物品],用户ID:%j', this.uid, type, item.value, this.uid);
        return false;
    }

    if (i.value < item.value) {
        logger.error('items-consume||%j||玩家通过[%j]消耗物品[%j] [%j]个/天失败[玩家没有足够该物品],用户ID:%j', this.uid, type, item.value, this.uid);
        return false;
    }

    i.value -= item.value;

    return true;

};

/**
 * 消耗物品
 * @param type
 * @param items
 * @param cb
 */
Player.prototype.consumeItems = function (type, items, cb) {
    var self = this;
    var result = _.map(items, function (item) {
        return self.consumeItem(item);
    });

    if (_.contains(result, false)) {
        cb({code: Code.FAIL, err: '消耗物品失败'});
        return;
    }
    cb({code: Code.OK});
};

/**
 * 升级
 */
Player.prototype.upgrade = function () {
    this.rank += 1;
}

/**
 * 签到
 */
Player.prototype.getCheckInGrant = function (cb) {
    if (this.properties.getCheckInGrant) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.CHECK_IN.ALREADY_CHECK_IN});
        return;
    }

    if (_.isNull(this.properties.lastCheckIn) || !Date.equalsDay(this.properties.lastCheckIn, Date.yesterday())) {
        this.properties.continuousCheckInNr = 0;
    }
    if (Date.equalsDay(this.properties.lastCheckIn, Date.yesterday())) {
        this.properties.continuousCheckInNr += 1;
    }

    var grantData = _.findWhere(globals.checkIn, {id: this.properties.continuousCheckInNr});

    if (_.isUndefined(grantData)) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.CHECK_IN.ERR});
        return;
    }

    //领取签到金币
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.GRANT, grantData.gold, function (data) {
    });

    //如果有附加物品, 添加物品
    if (!_.isUndefined(grantData.items) && grantData.items.length > 0) {
        this.addItems(consts.GLOBAL.ADD_ITEM_TYPE.GRANT, grantData.items, function () {
        });
    }

    this.saveAll();

    cb({code: Code.OK, gold: grantData.gold});

}

/**
 * 获取破产补助
 */
Player.prototype.getBankruptcyGrant = function (cb) {

    //如果今日已领完
    if (this.getBankruptcyGrantNr >= globals.bankruptcyGrant.times) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.BANKRUPTCY_GRANT.ALREADY_GRANT});
        return;
    }

    //如果钱够多, 不能领取
    if (this.gold >= globals.bankruptcyGrant.threshold) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.BANKRUPTCY_GRANT.MORE_MONEY});
        return;
    }

    this.getBankruptcyGrantNr += 1;

    var self = this;
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.GRANT, globals.bankruptcyGrant.gold, function (data) {
        self.saveAll();
        cb({code: Code.OK});
    });
}

/**
 * 游戏结束后处理各种附属情况
 * @param room
 * @param outcome
 * @param result
 */
Player.prototype.battle = function (room, outcome, result) {
    this.updateTask(room.id, outcome, result);
}


/**
 * 更新任务状态
 * @param roomId
 * @param outcome
 * @param result
 */
Player.prototype.updateTask = function(roomId, outcome, result) {
    var currentTasks = _.flatten([this.tasks.daily, this.tasks.forever]);

    _.each(currentTasks, function (currentTask) {
        //如果游戏房间是任务房间
        if (currentTask.roomId.length == 0 || _.contains(currentTask.roomId, roomId)) {
            //如果任务类型是胜利并且游戏结果是胜利,则更新任务状态
            if (currentTask.type == "win") {
                if (outcome == "win") {
                    currentTask.current += 1;
                }
            } else {
                currentTask.current += 1;
            }
            //如果任务类型是开会,则开会成功才更新任务状态
            if (current.type == "meeting") {
                if (result.meeting) {
                    currentTask.current += 1;
                }
            }
            if (currentTask.current >= currentTask.target) {
                //send ui command event, to notify user.

            }
        }
    });

    this.save();

}

/**
 * 领取任务奖励
 * @param taskId
 */
Player.prototype.getTaskGrant = function (taskId) {
    var allTaskConf = _.flatten([taskConf.daily, taskConf.forever]);
    var currentTasks = _.flatten([this.tasks.daily, this.tasks.forever]);

}

/////////////////
//emit..
/////////////////
Player.prototype.save = function () {
    this.emit('save');
}

Player.prototype.saveProfile = function () {
    this.emit('saveProfile');
}

Player.prototype.saveProperties = function () {
    this.emit('saveProperties');
}

Player.prototype.flushProperties = function () {
    this.emit('flushProperties');
}

Player.prototype.flush = function () {
    this.emit('flush');
}

Player.prototype.saveAll = function () {
    this.emit('saveAll');
}

Player.prototype.flushAll = function () {
    this.emit('flushAll');
}


module.exports = Player;

//player constructor
/**
 var player = {
    uid: mongojs.ObjectId(uid),
    nickName: nickName,
    avatar: avatar,
    gold: consts.GLOBAL.GOLD_INIT,
    winNr: 0,
    loseNr: 0,
    tieNr: 0,
    rank: 1,
    exp: 0,
    fragment: 0,
    properties: {
        getBankruptcyGrantNr: 0,
        lastCheckIn: null,
        continuousCheckInNr: 0,
        getCheckInGrant: false,
        isPayed: false,
        lastLoginAt: null
    },
    items: [],
    tasks: {},
    createdAt: Date.now()
};
 */

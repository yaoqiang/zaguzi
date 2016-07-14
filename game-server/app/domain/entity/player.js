/**
 * Module dependencies
 */
var util = require('util');
var consts = require('../../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.USER);
var pomelo = require('pomelo-rt');
var utils = require('../../util/utils');
var messageService = require('../../services/messageService');
var gameUtil = require('../../util/gameUtil');
var dispatcher = require('../../util/dispatcher').dispatch;
var _ = require('lodash');
require('date-utils');
var Promise = require('promise')

var Code = require('../../../../shared/code');

var Entity = require('./entity');
var ranks = require('../../../config/data/rank');
var roomConf = require('../../../config/data/room');
var itemConf = require('../../../config/data/item');
var taskConf = require('../../../config/data/task');
var globals = require('../../../config/data/globals');

var taskUtil = require('./task');


var Player = function (opts) {
    Entity.call(this, opts);

    this.id = opts.id;
    this.nickName = opts.nickName;
    this.gender = opts.gender;
    this.avatar = opts.avatar;
    this.gold = opts.gold;
    this.winNr = opts.winNr || 0;
    this.loseNr = opts.loseNr || 0;
    this.tieNr = opts.tieNr || 0;
    this.exp = opts.exp || 0;
    this.rank = opts.rank;
    this.fragment = opts.fragment;
    this.meetingTimes = opts.meetingTimes || 0;
    this.uid = opts.uid;
    this.items = opts.items;
    this.tasks = opts.tasks;
    this.properties = opts.properties;
    this.summary = opts.summary;
    this.createdAt = opts.createdAt;


    //for push message;
    this.connectors = pomelo.app.getServersByType('connector');
}

util.inherits(Player, Entity);

Player.prototype.updateProfile = function (data, cb) {

    this.nickName = data.nickName;
    this.avatar = data.avatar;
    this.gender = data.gender;
    this.summary = data.summary;

    this.nickName = utils.setContent(this.nickName);
    this.nickName = utils.replaceContent(this.nickName);
    this.summary = utils.setContent(this.summary);
    this.summary = utils.replaceContent(this.summary);

    logger.debug("user-update profile||%j||用户修改了个人基本信息，用户ID:%j", this.uid, this.uid);
    this.saveProfile();
    cb({code: Code.OK, nickName: this.nickName, summary: this.summary});
}

/**
 * 修改头像，只支持修改自定义头像上传，丢到七牛cdn，全格式为：http://domain/key，只存储key，以防将来切换domain（目测不会切换）
 */
Player.prototype.updateAvatar = function (data, cb) {

    this.avatar = data.avatar;

    logger.debug("user-update profile||%j||用户修改了个人基本信息，用户ID:%j", this.uid, this.uid);
    this.saveProfile();
    cb({code: Code.OK});
}

Player.prototype.addGold = function (type, gold, cb) {

    try {
        gold = parseInt(gold);
        var self = this;
        logger.info("%j", {uid: this.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.ADD_GOLD,
            message: '添加金币成功', created: new Date(), detail: {type: type, value: gold}});
        this.gold += gold;

        this.gold = this.gold < 0 ? 0 : this.gold;

        messageService.pushMessageToPlayer({
            uid: this.uid,
            sid: dispatcher(this.uid, this.connectors).id
        }, consts.EVENT.GOLD_CHANGE, {gold: self.gold});

        //如果破产了,
        if (this.gold < globals.bankruptcyGrant.threshold) {
            //如果还可以领取破产补助，则直接发送可领取破产补助消息：客户端弹框(框的zIndex要比结算高,以免被结算挡住)
            if (!this.properties.getBankruptcyGrantRunOut) {
                messageService.pushMessageToPlayer({
                    uid: this.uid,
                    sid: dispatcher(this.uid, this.connectors).id
                }, consts.EVENT.UI_ALERT_BANKRUPTCY_IN_GAME, {});
            }
        }

        cb({code: Code.OK, gold: this.gold});
    } catch (err) {
        logger.error("%j", {uid: this.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.ADD_GOLD,
            message: '添加金币失败', created: new Date(), detail: {type: type, value: gold}});
        cb({code: Code.FAIL});
    }


}

Player.prototype.payTax = function (roomId) {

    //税费规则

    var room = gameUtil.getRoomById(roomId);

   return room.fax * -1;

}

Player.prototype.win = function (roomId, gold, cb) {
    this.winNr += 1;
    var taxFee = this.payTax(roomId);
    this.addExp(2, {roomId: roomId});
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.BATTLE, gold + taxFee, cb);
}

Player.prototype.lose = function (roomId, gold, cb) {
    this.loseNr += 1;
    var taxFee = this.payTax(roomId);
    this.addExp(0, {roomId: roomId});
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.BATTLE, gold + taxFee, cb);
}

Player.prototype.tie = function (roomId, cb) {
    this.tieNr += 1;
    var taxFee = this.payTax(roomId);
    this.addExp(1, {roomId: roomId});
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.BATTLE, taxFee, cb);
}

Player.prototype.addFragment = function (type, fragment, cb) {
    this.fragment += fragment;
    logger.info("%j", {uid: this.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.ADD_FRAGMENT,
        message: '添加元宝成功', created: new Date(), detail: {type: type, value: fragment}});
    cb({fragment: this.fragment});
    var self = this;
    messageService.pushMessageToPlayer({
        uid: this.uid,
        sid: dispatcher(this.uid, this.connectors).id
    }, consts.EVENT.INGOT_CHANGE, {ingot: self.fragment});
}

Player.prototype.addExp = function (exp, args) {

    this.exp += exp;

    var rank = _.findWhere(ranks, {rank: this.rank});
    if (this.exp > rank.exp) {
        this.upgrade();
    }
}

//        id, 个数/天数, 类型
// item: {id: Int, value: Int}
Player.prototype.addItem = function (type, item) {
    if (!_.isObject(item)) {
        logger.error("%j", {uid: this.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.ADD_ITEM,
            message: '获得物品失败-参数错误', created: new Date(), detail: {type: type, itemId: item.id, value: item.value}});
        return false;
    }

    //查找物品是否在配置表中, data: item.json的item对象
    var data = _.findWhere(itemConf, {id: item.id});

    if (_.isUndefined(data)) {
        logger.error("%j", {uid: this.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.ADD_ITEM,
            message: '获得物品失败-参数错误', created: new Date(), detail: {type: type, itemId: item.id, value: item.value}});
        return false;
    }
    //查询玩家是否有该物品, i: player.items
    var i = _.findWhere(this.items, {id: item.id});

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
            if (new Date(i.value).isBefore(now)) {
                value = now.add({days: item.value});
            } else {
                value = new Date(i.value).add({days: item.value});
            }
        }
        else {
            value = i.value + item.value;
        }
    }
    //如果玩家之前没有该物品, 则push; 如果有,则修改
    if (_.isUndefined(i)) {
        this.items.push({id: data.id, name: data.name, title: data.title, icon: data.icon, value: value, mode: data.mode});
    } else {
        i.value = value;
    }

    logger.info("%j", {uid: this.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.ADD_ITEM,
        message: '添加物品成功', created: new Date(), detail: {type: type, itemId: item.id, item: data.title, value: item.value}});

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

Player.prototype.getTrumpetValue = function() {
    var trumpetValue = _.findWhere(this.items, {id: 2});
    if (trumpetValue) {
        return trumpetValue.value;
    }
    return 0;
}

/**
 * 获得道具是否存在并且有效（count>0 || term > now）
 * @param item {id: Int} 物品ID
 * @return true/false
 */
Player.prototype.isItemExistAndNotExpired = function (item) {
    if (_.isNull(this.items) || _.isUndefined(this.items)) {
        return false;
    }

    if (!_.isArray(this.items)) {
        return false;
    }

    if (this.items.length <= 0) {
        return false;
    }

    var existItem = _.findWhere(this.items, {id: item.id});
    
    if (_.isUndefined(existItem)) return false;
    
    if (existItem.mode === consts.GLOBAL.ITEM_MODE.TERM) {
        //如果已过期, 则代表没有
        if (new Date(existItem.value).isBefore(new Date())) {
            return false;
        } 
        return true;
    }
    if (existItem.value <= 0) return false;
    
    return true;
}


Player.prototype.consumeItem = function (type, item) {
    //查询玩家是否有该物品
    var i = _.findWhere(this.items, {id: item.id});
    if (_.isUndefined(i)) {
        logger.debug('items-consume||%j||玩家通过[%j]消耗物品[%j] [%j]个/天失败[玩家没有该物品],用户ID:%j', this.uid, type, item.value, this.uid);
        return false;
    }

    if (i.value < item.value) {
        logger.debug('items-consume||%j||玩家通过[%j]消耗物品[%j] [%j]个/天失败[玩家没有足够该物品],用户ID:%j', this.uid, type, item.value, this.uid);
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
    var self = this;
    if (this.properties.getCheckInGrant) {
        logger.debug("user-check in||%j||玩家签到失败, 玩家已签到, 用户ID:%j", this.uid, this.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.CHECK_IN.ALREADY_CHECK_IN});
        return;
    }

    var grantData = globals.checkIn[this.properties.continuousCheckInNr];

    if (_.isUndefined(grantData)) {
        logger.debug("user-check in||%j||玩家签到失败, , 用户ID:%j", this.uid, this.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.CHECK_IN.ERR});
        return;
    }

    ////////////////
    // 确保更新金币和物品后 触发Sync Queue
    ////////////////
    new Promise(function(resolve, reject) {
        self.addGold(consts.GLOBAL.ADD_GOLD_TYPE.GRANT, grantData.gold, function () {
            //如果有附加物品
            if (!_.isUndefined(grantData.items) && grantData.items.length > 0) {
                self.addItems(consts.GLOBAL.ADD_ITEM_TYPE.GRANT, grantData.items, function () {
                    resolve();
                });
            }
            else {
                resolve();
            }
        })
    }).then(function () {
        self.properties.getCheckInGrant = true;
        self.properties.continuousCheckInNr += 1;
        self.properties.lastCheckIn = new Date();
        self.save();
        self.saveProperties();
        self.saveItem();
    }).done();


    cb({code: Code.OK, gold: grantData.gold, day: this.properties.continuousCheckInNr+1});

}

/**
 * 获取破产补助
 */
Player.prototype.getBankruptcyGrant = function (cb) {

    //如果今日已领完
    if (this.properties.getBankruptcyGrantRunOut) {
        logger.debug("user-grant||%j||玩家已领取今日补助, , 用户ID:%j", this.uid, this.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.BANKRUPTCY_GRANT.ALREADY_GRANT});
        return;
    }

    //如果钱够多, 不能领取
    if (this.gold >= globals.bankruptcyGrant.threshold) {
        logger.debug("user-grant||%j||玩家金币超出领取最低限, , 用户ID:%j", this.uid, this.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.BANKRUPTCY_GRANT.MORE_MONEY});
        return;
    }

    this.properties.getBankruptcyGrantNr += 1;

    if (this.properties.getBankruptcyGrantNr >= globals.bankruptcyGrant.times) {
        this.properties.getBankruptcyGrantRunOut = true;
    }

    var self = this;
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.GRANT, globals.bankruptcyGrant.gold, function (data) {
        self.save();
        cb({code: Code.OK, gold: globals.bankruptcyGrant.gold, canGetBankruptcyGrant: self.properties.getBankruptcyGrantRunOut});
    });
}

/**
 * 游戏结束后处理各种附属情况
 * @param room
 * @param outcome
 * @param attributes
 */
Player.prototype.battle = function (roomId, outcome, attributes) {
    this.updateTask(roomId, outcome, attributes);
}


/**
 * 更新任务状态
 * @param roomId
 * @param outcome
 * @param attributes
 */
Player.prototype.updateTask = function (roomId, outcome, attributes) {
    var currentTasks = _.flatten([this.tasks.daily, this.tasks.forever]);

    //未完成任务列表
    var unfinishedTasks = _.filter(currentTasks, function (t) {
        return t.finished == false;
    });

    var self = this;
    _.each(unfinishedTasks, function (currentTask) {

        //如果游戏房间是任务房间
        if (currentTask.roomId.length == 0 || _.contains(currentTask.roomId, roomId)) {

            //如果任务类型是胜利并且游戏结果是胜利,则更新任务状态
            if (currentTask.type == "win") {
                //因outcome是使用常量定义,是大写的WIN
                if (outcome == consts.GAME.ACTOR_RESULT.WIN) {
                    currentTask.current += 1;
                }
            }
            //如果任务类型是开会,则开会成功才更新任务状态
            else if (currentTask.type == "meeting") {
                if (attributes.meeting) {
                    currentTask.current += 1;
                }
            }
            else {
                currentTask.current += 1;
            }

            if (currentTask.current >= currentTask.target) {
                //send ui command event, to notify user.
            }

        }

    });

    this.saveTask();

}

/**
 * 领取任务奖励
 * @param taskId
 * @param cb
 */
Player.prototype.getTaskGrant = function (taskId, cb) {

    var self = this;

    var currentTasks = _.flatten([this.tasks.daily, this.tasks.forever]);

    var task = _.findWhere(currentTasks, {id: taskId});
    if (_.isUndefined(task)) {
        logger.debug("user-task grant||%j||玩家任务数据错误, 用户ID:%j", this.uid, this.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TASK_GRANT.ERR});
        return;
    }

    if (task.current < task.target) {
        logger.debug("user-task grant||%j||玩家任务状态不满足领取, 用户ID:%j", this.uid, this.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TASK_GRANT.ERR});
        return;
    }

    if (task.finished) {
        logger.debug("user-task grant||%j||玩家任务状态已领取, 用户ID:%j", this.uid, this.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TASK_GRANT.ALREADY_GRANT});
        return;
    }

    //添加金币
    if (taskId < 400000) {
        this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.TASK, task.grant, function () {
        });
    } else {
        //添加元宝单独使用player.fragment
        this.addFragment(consts.GLOBAL.ADD_FRAGMENT_TYPE.TASK, task.fragment, function () {
        });
    }

    //获取下一个任务并更新player.tasks, 最后返回客户端新任务信息
    taskUtil.getNextTask(taskId, function (data) {
        var nextTask = data.taskConf;
        if (nextTask.finished) {
            nextTask.current = nextTask.target;
        } else {
            //如果任务当前值是1，而且是任务完成状态，那target也是1，为系列任务的任务值正确，需要为current+1，否则下一个任务值就是0。
            nextTask.current = (task.current == 1 ? task.current + 1 : task.current) - task.target;
        }


        if (taskId < 200000) {
            var t = _.findLastIndex(self.tasks.daily, {id: taskId});
            self.tasks.daily[t] = nextTask;
        } else {
            var t = _.findLastIndex(self.tasks.forever, {id: taskId});
            self.tasks.forever[t] = nextTask;
        }
        
        self.saveTask();
        cb({code: Code.OK, nextTask: nextTask});
    })


}


//重置补助和签到状态
Player.prototype.clearGrantRecord = function () {
    this.properties.getBankruptcyGrantNr = 0;
    this.properties.getCheckInGrant = false;
    this.properties.getBankruptcyGrantRunOut = false;
}

//初始化每日任务
Player.prototype.initDailyTasks = function () {
    this.tasks.daily = taskUtil.initDailyTasks();
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

Player.prototype.saveTask = function () {
    this.emit('saveTask');
}

Player.prototype.saveItem = function () {
    this.emit('saveItem');
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

Player.prototype.saveOnEnter = function () {
    this.emit('saveOnEnter');
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
    meetingTimes: 0,
    properties: {
        getBankruptcyGrantNr: 0,
        getBankruptcyGrantRunOut: false,
        lastCheckIn: null,
        continuousCheckInNr: 0,
        getCheckInGrant: false,
        isPayed: false,
        lastLoginAt: null
    },
    items: [],
    tasks: {},
    summary: '',
    createdAt: Date.now()
};
 */

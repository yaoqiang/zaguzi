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
var rooms = require('../../../config/data/room');
var itemConf = require('../../../config/data/item');
var globals = require('../../../config/data/globals');


var Player = function(opts)
{
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

    this.properties = opts.properties;
    this.createdAt = opts.createdAt;

}

util.inherits(Player, Entity);

Player.prototype.updateProfile = function (data, cb) {

    this.nickName = data.nickName;
    this.avatar = data.avatar;

    logger.info("user||profile||用户修改了个人基本信息，用户ID:%j", this.uid);
    this.save();
    cb();
}

Player.prototype.addGold = function (type, gold, cb) {

    logger.info("user||gold||用户通过[%j]获得了[%j]金币，用户ID:%j", type, gold, this.uid);
    this.gold += gold;

    this.gold = this.gold < 0 ? 0 : this.gold;

    cb({gold: this.gold});

}

Player.prototype.payTax = function (roomId) {

    //税费规则

    var gold = 0;

    var room = gameUtil.getRoomById(roomId);

    var gold = room.fax * -1;

    logger.info("user||gold||用户游戏结束扣除[%j]金币税，用户ID:%j", gold, this.uid);
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
    logger.info("user||fragment||用户通过[%j]获得了[%j]元宝，用户ID:%j", type, fragment, this.uid);
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
Player.prototype.addItem = function(type, item, cb) {
  if (!_.isObject(item)) {
    logger.error('参数错误');
    cb({code: Code.FAIL, err: consts.ERR_CODE.PARAMETER_ERR});
    return;
  }

  //查找物品是否在配置表中
  var data = _.findWhere(itemConf, {id: item.id});

  if (_.isUndefined(data)) {
    logger.error('参数错误');
    cb({code: Code.FAIL, err: consts.ERR_CODE.PARAMETER_ERR});
    return;
  }

  //如果玩家已有该物品
  var i = _.findWhere(this.items, {id: item.id});
  logger.info("user||items||玩家通过[%j]获得物品[%j] [%j]个/天,用户ID:%j", type, item.v, this.uid);
  if (_.isUndefined(i)) {
    
  } else {

  }

}

Player.prototype.addItems = function(type, items, cb) {

}

Player.prototype.exist = function(item) {
  if (_.isNull(this.items) || _.isUndefined(this.items)) {
    cb({exist: false});
    return;
  }

  if (!_.isArray(this.items)) {
    cb({exist: false});
    return;
  }

  if (this.items.length <= 0) {
    cb({exist: false});
    return;
  }

  var exist = _.findWhere(this.items, {id: item.id});

  return !_.isUndefined(exist);
}

Player.prototype.isExpired = function(k, cb) {

}

Player.prototype.consumeItem = function (type, item, cb) {
  // body...
};

Player.prototype.consumeItems = function (type, items, cb) {
  // body...
};

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
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.GRANT, grantData.gold, function(data) {
    });

    //如果有附加物品, 添加物品
    if (!_.isUndefined(grantData.items) && grantData.items.length > 0) {
      this.addItems(consts.GLOBAL.ADD_ITEM_TYPE.GRANT, grantData.items, function() {
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
  this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.GRANT, globals.bankruptcyGrant.gold, function(data){
    self.saveAll();
    cb({code: Code.OK});
  });
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
    createdAt: Date.now()
};
*/

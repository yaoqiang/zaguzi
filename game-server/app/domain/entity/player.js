/**
 * Module dependencies
 */
var util = require('util');
var consts = require('../../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.USER, __filename);
var pomelo = require('pomelo');
var utils = require('../../util/utils');
var _ = require('underscore');
require('date-utils');

var Entity = require('./entity');
var ranks = require('../../../config/data/rank');

var messageService = require('../../services/messageService');


var Player = function(opts)
{
    Entity.call(this, opts);

    this.id = opts.id;
    this.nickName = opts.nickName;
    this.avatar = opts.avatar;
    this.gold = opts.gold;
    this.winNr = opts.winNr || 0;
    this.loseNr = opts.loseNr || 0;
    this.exp = opts.exp || 0;
    this.rank = opts.rank;
    this.fragment = opts.fragment;
    this.uid = opts.uid;

    this.properties = null;

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

    messageService.pushMessageToPlayer(this.uid, consts.EVENT.GOLD_CHANGE, {gold: this.gold});
    cb();

}

Player.prototype.win = function (roomId, gold, cb) {
    this.winNr += 1;
    this.addExp(true, {roomId: roomId});
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.BATTLE, gold, cb);
}

Player.prototype.lose = function (roomId, gold, cb) {
    this.loseNr += 1;
    this.addExp(roomId, false);
    this.addGold(consts.GLOBAL.ADD_GOLD_TYPE.BATTLE, gold, cb);
}


Player.prototype.addFragment = function (type, fragment, cb) {
    logger.info("user||fragment||用户通过[%j]获得了[%j]元宝，用户ID:%j", type, fragment, this.uid);
    this.fragment += fragment;
}

Player.prototype.addExp = function (win, args) {

    var exp = win ? 2 : 1;
    this.exp += exp;

    var rank = _.findWhere(ranks, {rank: this.rank});
    if (this.exp > rank.exp) {
        this.upgrade();
    }
}

Player.prototype.upgrade = function () {
    this.rank += 1;
}


//emit..
Player.prototype.save = function () {
    this.emit('save');
}

Player.prototype.saveProfile = function () {
    this.emit('saveProfile');
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
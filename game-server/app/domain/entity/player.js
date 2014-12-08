/**
 * Module dependencies
 */
var util = require('util');
var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var utils = require('../../util/utils');
var underscore = require('underscore');
require('date-utils');

var Entity = require('./entity');


var Player = function(opts)
{
    Entity.call(this, opts);
    this.nickName = opts.nickName;
    this.avatar = opts.avatar;
    this.gold = opts.gold;
    this.rank = opts.rank;
    this.fragment = opts.fragment;
    this.lastLogin = opts.lastLogin || Date.now();
    this.getBankruptNr = opts.getBankruptNr || 0;
    this.continuousLoginNr = opts.continuousLoginNr || 1;
    this.isGetContinuousLogin = opts.isGetContinuousLogin || false;
    this.isFirstPay = opts.isFirstPay || false;
    this.taskJson = opts.taskJson || '';
    this.itemJson = opts.itemJson || '';
    this.uid = opts.uid;

}

util.inherits(Player, Entity);



module.exports = Player;
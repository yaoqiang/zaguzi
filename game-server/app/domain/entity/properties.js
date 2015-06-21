/**
 * Module dependencies
 */
var util = require('util');
var consts = require('../../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.USER, __filename);
var pomelo = require('pomelo');
var utils = require('../../util/utils');
var underscore = require('underscore');
var signInConf = require('../../../config/data/signin');
require('date-utils');

var Entity = require('./entity');


var Properties = function(opts)
{
    Entity.call(this, opts);

    this.id = opts.id;
    this.userId = opts.userId;
    this.lastLogin = opts.lastLogin;
    this.getBankruptNr = opts.getBankruptNr;
    this.continuousLoginNr = opts.continuousLoginNr;
    this.isGetContinuousLogin = opts.isGetContinuousLogin;
    this.isFirstPay = opts.isFirstPay;
    this.taskJson = opts.taskJson;
    this.itemJson = opts.itemJson;

}

util.inherits(Properties, Entity);


Properties.prototype.getSignInAward = function (cb) {

}

Properties.prototype.getBankruptAward = function (cb) {

}

Properties.prototype.save = function () {
    this.emit('save')
}

Properties.prototype.flush = function () {
    this.emit('flush')
}


module.exports = Properties;
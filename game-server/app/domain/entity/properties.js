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





module.exports = Properties;
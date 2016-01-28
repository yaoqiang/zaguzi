var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var open = require('../consts/open');
var logger = require('pomelo-logger').getLogger(consts.LOG.SYSTEM);
var Code = require('../../../shared/code');

var Promise = require('promise');

var request = require('request');

var exp = module.exports

/**
 * 聚合API发送短信
 */
exp.sendSMS = function (data, cb) {
    
}

var shopConf = require('../../config/data/shop');
var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.USER);
var Code = require('../../../shared/code');

var Promise = require('promise');

var exp = module.exports

exp.getShopList = function (device) {
    return shopConf[device];
}

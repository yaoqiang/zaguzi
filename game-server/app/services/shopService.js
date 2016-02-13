var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var Code = require('../../../shared/code');
var shopConf = require('../../config/data/shop');

var logger = require('log4js').getLogger(consts.LOG.USER);

var Promise = require('promise');

var shopService = module.exports

shopService.getShopList = function (device) {
    return shopConf[device];
}

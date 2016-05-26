var _ = require('lodash');
var pomelo = require('pomelo-rt');

var consts = require('../consts/consts');
var Code = require('../../../shared/code');
var shopConf = require('../../config/data/shop');

var logger = require('log4js').getLogger(consts.LOG.USER);

var Promise = require('promise');

var shopService = module.exports

shopService.getShopList = function (device, type) {
    //如果没有传type,可能是客户版本是v1.2前, 或者是backend请求
    //为满足兼容v1.2
    if (_.isUndefined(type)) {
        return _.union(shopConf[device].gold, shopConf[device].prop);
    }
    return shopConf[device][type];
}

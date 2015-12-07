/**
 * Module dependencies
 */
var util = require('util');
var _ = require('underscore');
var Code = require('../../../../shared/code');
var items = require('../../../config/data/items');
var logger = require('pomelo-logger').getLogger(consts.LOG.USER, __filename);
var itemUtil = exports.modules

itemUtil.addItem = function(type, item, cb) {
  


}

itemUtil.addItems = function(type, items, cb) {
  if (!_.isArray(items) || _.size(items) <= 0) {
    logger.error('参数错误');
    cb({code: Code.FAIL});
    return;
  }
}

itemUtil.exist = function(k, cb) {

}

itemUtil.isExpired = function(k, cb) {

}

itemUtil.consumeItems = function(k, cb) {

}

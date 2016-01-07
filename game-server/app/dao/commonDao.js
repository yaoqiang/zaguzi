var logger = require('pomelo-logger').getLogger(consts.LOG.SYSTEM);
var pomelo = require('pomelo');
var _ = require('lodash');

var async = require('async');
require('date-utils');
var utils = require('../util/utils');
var consts = require('../consts/consts');
var globals = require('../../config/data/globals');

var db = pomelo.app.get('dbclient');
var mongojs = require('mongojs');

var commonDao = module.exports;

commonDao.listExchange = function (cb) {
    db.exchangeList.find(function (err, docs) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, docs);
        }
    })
}

commonDao.getExchangeById = function (id, cb) {
    db.exchangeList.findOne({_id: mongojs.ObjectId(id)}, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}

commonDao.exchange = function (id, count, cb) {

}
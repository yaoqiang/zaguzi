var consts = require('../consts/consts');

var logger = require('pomelo-logger').getLogger(consts.LOG.SYSTEM);
var pomelo = require('pomelo');
var _ = require('lodash');

var async = require('async');
require('date-utils');
var utils = require('../util/utils');
var globals = require('../../config/data/globals');

var db = pomelo.app.get('dbclient');
var mongojs = require('mongojs');

var Promise = require('promise');

var commonDao = module.exports;

/**
 * 根据兑换类型查询兑换列表(可能将来兑换物品分两大类,一类是自有产品, 二类是外部导入产品
 * @param type
 * @param cb
 */
commonDao.listExchangeList = function (cb) {
    db.exchangeList.find({enabled: true}, function (err, docs) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, docs);
        }
    })
}

/**
 * 根据兑换id获取兑换产品明细
 * @param id
 * @param cb
 */
commonDao.getExchangeListById = function (id, cb) {
    db.exchangeList.findOne({_id: mongojs.ObjectId(id), enabled: true}, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}

commonDao.listExchangeRecordByUid = function (uid, cb) {
    db.exchangeRecord.find({uid: mongojs.ObjectId(uid)}, function (err, docs) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, docs);
        }
    })
}

/**
 * 兑换,
 * @param exchangeId
 * @param uid
 * @param count
 * @param params {mobile: xx, address: xx, courier{company: xx, no: xx},
 * @param cb
 */
commonDao.exchange = function (exchangeId, uid, count, params, cb) {
    var exchangeRecord = {
        exchangeId: mongojs.ObjectId(exchangeId),
        uid: mongojs.ObjectId(uid),
        count: count,
        params: params,
        createdAt: new Date()
    }
    new Promise(function (resolve, reject) {
        db.exchangeRecord.save(exchangeRecord, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(doc);
            }
        })
    }).then(function (doc) {
        db.exchangeList.findAndModify({
            query: {_id: mongojs.ObjectId(exchangeId)},
            update: {$inc: {count: -count}}
        })
        utils.invokeCallback(cb, null, doc);
    }, function (err) {
        utils.invokeCallback(cb, err, null);
    })
}



//ranking list
commonDao.getRankingList = function (data, cb) {
    db.rankingList.findOne({type: data.type, date: new Date()}, function(err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        }
        else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}


//版本检查
commonDao.getTopOfAppReleaseRecord = function (data, cb) {
    db.appReleaseRecord.findOne({}, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        }
        else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}


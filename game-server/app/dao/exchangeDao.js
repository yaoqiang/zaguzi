var _ = require('lodash');

var pomelo = require('pomelo-rt');

var consts = require('../consts/consts');
var globals = require('../../config/data/globals');
var Code = require('../../../shared/code');

var logger = require('log4js').getLogger(consts.LOG.SYSTEM);

require('date-utils');

var db = pomelo.app.get('dbclient');
var mongojs = require('mongojs');

var Promise = require('promise');

var passwordHash = require('password-hash');

var utils = require('../util/utils');

var commonDao = require('./commonDao');



var exchangeDao = module.exports;

/**
 * 根据兑换类型查询兑换列表(可能将来兑换物品分两大类,一类是自有产品, 二类是外部导入产品
 * @param type
 * @param cb
 */
exchangeDao.listExchangeList = function (data, cb) {
    db.exchangeList.find({enabled: true}, function (err, docs) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, docs);
        }
    })
}


//new
exchangeDao.listExchangeListNew = function (data, cb) {
    var cond = {enabled: true};

    if (data.os === 'ios') {
        commonDao.getAppleSetting(function (appleSetting) {

            if (appleSetting.inReview) {
                cond.type = consts.EXCHANGE.TYPE.VIRTUAL;
            }

            db.exchangeList.find(cond, function (err, docs) {
                if (err) {
                    utils.invokeCallback(cb, err, null);
                } else {
                    utils.invokeCallback(cb, null, docs);
                }
            })
        })
    }
    else {
        db.exchangeList.find(cond, function (err, docs) {
            if (err) {
                utils.invokeCallback(cb, err, null);
            } else {
                utils.invokeCallback(cb, null, docs);
            }
        })
    }

}

/**
 * 根据兑换id获取兑换产品明细
 * @param id
 * @param cb
 */
exchangeDao.getExchangeListById = function (id, cb) {
    db.exchangeList.findOne({_id: mongojs.ObjectId(id), enabled: true}, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}

/**
 * 根据uid获取兑换记录
 */
exchangeDao.listExchangeRecordByUid = function (uid, cb) {
    db.exchangeRecord.find({uid: mongojs.ObjectId(uid)}).sort({_id: -1}).limit(20, function (err, docs) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, docs);
        }
    })
}

/**
 * 根据兑换单号获取兑换记录
 */
exchangeDao.getExchangeRecordByNumber = function (number, cb) {
    db.exchangeRecord.findOne({number: mongojs.ObjectId(number)}, function (err, docs) {
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
 * @param state
 * @param params {mobile: xx, address: xx, contact: xx},
 * @param cb
 */
exchangeDao.exchange = function (exchangeId, uid, number, productName, count, state, fragment, params, cb) {
    var exchangeRecord = {
        exchangeId: mongojs.ObjectId(exchangeId),
        uid: mongojs.ObjectId(uid),
        number: number,
        productName: productName,
        state: state,
        count: count,
        mobile: params.mobile,
        address: params.address,
        contact: params.contact,
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
    })
    .then(function (doc) {
        db.exchangeList.findAndModify({
            query: {_id: mongojs.ObjectId(exchangeId)},
            update: {$inc: {inventory: -count}}
        }, function(err, doc, lastErrorObject) {
            if (err) {
                utils.invokeCallback(cb, err, null);
            } else {
                utils.invokeCallback(cb, null, doc);
            }
        })
    }, function (err) {
        utils.invokeCallback(cb, err, null);
    });
}
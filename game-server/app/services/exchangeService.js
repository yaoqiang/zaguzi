var _ = require('lodash');
var pomelo = require('pomelo-rt');

var consts = require('../consts/consts');
var globals = require('../../config/data/globals');
var Code = require('../../../shared/code');

var logger = require('log4js').getLogger(consts.LOG.USER);

var messageService = require('./messageService');
var openService = require('./openService');
var playerService = require('./playerService');

var exchangeDao = require('../dao/exchangeDao');
var userDao = require('../dao/userDao');

var utils = require('../util/utils');

var mongojs = require('mongojs');


var exchangeService = module.exports

exchangeService.getExchangeRecordByNumber = function (data, cb) {
    exchangeDao.getExchangeRecordByNumber(data.orderid, cb);
}

/**
 * 获取兑换列表
 * @param data
 * @param cb
 */
exchangeService.getExchangeList = function (data, cb) {

    playerService.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.debug("user-exchange list||%j||玩家获取兑换列表失败, 玩家不在缓存, 用户ID:%j", data.uid, data.uid);
            cb({ code: Code.FAIL });
            return;
        }

        // return result:
        // [{id: xx, name: xx, icon: xx, inventory: xx,
        // fragment: xx, createdAt: xx, enabled: true/false}
        exchangeDao.listExchangeList({}, function (err, docs) {
            if (err != null) {
                cb({ code: Code.OK, exchangeList: [] });
            }
            else {
                cb({ code: Code.OK, exchangeList: docs });
            }
        });

    });
}

//
exchangeService.listExchangeListNew = function (data, cb) {

    // return result:
    // [{id: xx, name: xx, icon: xx, inventory: xx,
    // fragment: xx, createdAt: xx, enabled: true/false}
    // 参考initTestData.js
    exchangeDao.listExchangeListNew(data, function (err, docs) {
        if (err != null) {
            cb({ code: Code.OK, exchangeList: [] });
        }
        else {
            cb({ code: Code.OK, exchangeList: docs });
        }
    });

}


exchangeService.getMyExchangeRecordList = function (data, cb) {


    // return result:
    // [{id: xx, name: xx, icon: xx, inventory: xx,
    // fragment: xx, createdAt: xx, enabled: true/false,
    // type: consts.EXCHANGE.TYPE.xx, mobile: xx, address: xx, contact: xx}]
    exchangeDao.listExchangeRecordByUid(data.uid, function (err, docs) {
        if (err != null) {
            cb({ code: Code.OK, exchangeRecordList: [] });
        }
        else {
            cb({ code: Code.OK, exchangeRecordList: docs });
        }
    });

}

/**
 * 兑换
 * @param data {uid: xx, exchangeId: xx, mobile: xx, contact: xx, address: xx}
 * @param cb
 */
exchangeService.exchange = function (data, cb) {
    playerService.getUserCacheByUid(data.uid, function (user) {
        if (user == null || _.isUndefined(user)) {
            logger.debug("user-exchange list||%j||玩家获取兑换列表失败, 玩家不在缓存, 用户ID:%j", data.uid, data.uid);
            cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.ERR });
            return;
        }

        exchangeDao.getExchangeListById(data.exchangeId, function (err, doc) {
            if (err) {
                logger.debug("%j", {uid: data.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.EXCHANGE,
                    message: '玩家兑换物品失败', created: new Date(), detail: {exchangeId: data.exchangeId}});
                cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.ERR });
                return;
            }
            if (_.isNull(doc)) {
                logger.debug("user-exchange||%j||玩家兑换物品失败, 兑换ID:[%j],兑换物品不存在或已下线, 用户ID:%j", data.uid, data.exchangeId, data.uid);
                cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.ITEM_OFFLINE });
                return;
            }

            if (user.player.fragment < doc.fragment) {
                logger.debug("%j", {uid: data.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.EXCHANGE,
                    message: '玩家兑换物品失败-玩家元宝不足', created: new Date(), detail: {exchangeId: data.exchangeId}});
                cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.YUANBAO_NOT_ENOUGH });
                return;
            }

            if (data.count > doc.inventory) {
                logger.debug("user-exchange||%j||玩家兑换物品失败, 兑换ID:[%j], 兑换物品库存不足, 用户ID:%j", data.uid, data.exchangeId, data.uid);
                cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.INVENTORY_NOT_ENOUGH });
                return;
            }


            //生成订单号
            data.number = mongojs.ObjectId().toString();
            //面额
            data.denomination = doc.denomination;
            //产品名称
            data.productName = doc.name;

            //先处理虚拟兑换
            if (doc.type == consts.EXCHANGE.TYPE.VIRTUAL) {

                exchangeDao.exchange(data.exchangeId, data.uid, data.number, data.productName, data.count, consts.ORDER.STATE.FINISHED, doc.fragment, {}, function (err, result) {
                    if (err) {
                        logger.error("%j", {uid: data.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.EXCHANGE,
                            message: '玩家兑换虚拟物品失败', created: new Date(), detail: {exchangeId: data.exchangeId}});
                        cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.NEED_CUSTOMER });
                        return;
                    }
                    logger.info("%j", {uid: data.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.EXCHANGE,
                        message: '玩家兑换虚拟物品成功', created: new Date(), detail: {exchangeId: data.exchangeId}});
                    //如果兑换提交成功, 则更新player.fragment;
                    user.player.addFragment(consts.GLOBAL.ADD_FRAGMENT_TYPE.EXCHANGE, -doc.fragment, function(fragmentResult) {
                        if (doc.gold > 0) {
                            user.player.addGold(consts.GLOBAL.ADD_GOLD_TYPE.EXCHANGE, doc.gold, function () {
                                user.player.addItems(consts.GLOBAL.ADD_ITEM_TYPE.EXCHANGE, doc.items, function () {
                                    cb({code: Code.OK});
                                })
                            })
                        }
                        else {
                            user.player.addItems(consts.GLOBAL.ADD_ITEM_TYPE.EXCHANGE, doc.items, function () {
                                cb({code: Code.OK});
                            })
                        }


                    });
                });
            }
            //如果是话费类
            else if (doc.type == consts.EXCHANGE.TYPE.INBOX_CALL) {

                //validation mobile
                if (_.isEmpty(data.mobile)) {
                    logger.debug("user-exchange||%j||玩家兑换物品失败, 兑换ID:[%j], 未填写手机号码, 用户ID:%j", data.uid, data.exchangeId, data.uid);
                    cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.NOT_BLANK_MOBILE });
                    return;
                }

                if (!utils.mobileValidate(data.mobile)) {
                    logger.debug("user-exchange||%j||玩家兑换物品失败, 兑换ID:[%j], 手机号码无效[%j], 用户ID:%j", data.uid, data.exchangeId, data.mobile, data.uid);
                    cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.INVALID_MOBILE });
                    return;
                }


                //调用第三方平台充值(apix.cn)
                openService.mobileRecharge(data, function(rechargeResult) {
                    //如果APIX立即返回充值失败, 则通知客户端失败信息
                    if (rechargeResult.code !== Code.OK) {
                        logger.error("%j", {uid: data.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.EXCHANGE,
                            message: '玩家兑换物品失败(API立即返回失败.)', created: new Date(), detail: {exchangeId: data.exchangeId, mobile: data.mobile}});
                        //
                        cb({code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.APIX_INVALID});
                    } else {
                        
                        //如果APIX返回成功，则初步定义为充值成功；后续会根据回调或OSS跟进（如有后续失败并没有收到回调的，可人工在OSS处理）
                        exchangeDao.exchange(data.exchangeId, data.uid, data.number, data.productName, data.count, consts.ORDER.STATE.FINISHED, doc.fragment, { mobile: data.mobile }, function (err, result) {
                            if (err) {
                                logger.error("%j", {uid: data.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.EXCHANGE,
                                    message: '玩家兑换物品失败(APIX已返回状态=成功)', created: new Date(), detail: {exchangeId: data.exchangeId, mobile: data.mobile}});
                                cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.NEED_CUSTOMER });
                                return;
                            }
                            logger.info("%j", {uid: data.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.EXCHANGE,
                                message: '玩家兑换话费|流量成功', created: new Date(), detail: {exchangeId: data.exchangeId, mobile: data.mobile}});
                            //如果充值提交成功, 则更新player.fragment;
                            user.player.addFragment(consts.GLOBAL.ADD_FRAGMENT_TYPE.EXCHANGE, -doc.fragment, function(fragmentResult) {
                                cb({code: Code.OK});
                            });
                        });
                    }
                });

            }
            else {
                //如果是实物类
                if (_.isEmpty(data.contact)) {
                    logger.debug("user-exchange||%s||玩家兑换物品失败, 兑换ID:[%s], 未填写联系人或收件地址, 用户ID:%s", data.uid, data.exchangeId, data.uid);
                    cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.NOT_BLANK_CONTACT });
                    return;
                }

                if (_.isEmpty(data.address)) {
                    logger.debug("user-exchange||%s||玩家兑换物品失败, 兑换ID:[%s], 未填写收件地址, 用户ID:%s", data.uid, data.exchangeId, data.uid);
                    cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.NOT_BLANK_ADDRESS });
                    return;
                }

                //存储兑换记录, 在后台跟进操作
                exchangeDao.exchange(data.exchangeId, data.uid, data.number, data.productName, data.count, consts.ORDER.STATE.SUBMIT, doc.fragment, { mobile: data.mobile, contact: data.contact, address: data.address }, function (err, result) {
                    if (err == null || result == null) {
                        logger.error("%j", {uid: data.uid, type: consts.LOG.CONF.USER.TYPE, action: consts.LOG.CONF.USER.ACTION.EXCHANGE,
                            message: '玩家兑换物品失败(实物)', created: new Date(), detail: {exchangeId: data.exchangeId, mobile: data.mobile, contact: data.contact, address: data.address}});
                        cb({ code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.NEED_CUSTOMER });
                        return;
                    }

                    cb({ code: Code.OK });

                });

            }


        })

    });
}


exchangeService.getExchangeListById = function (data, cb) {
    exchangeDao.getExchangeListById(data, cb);
}
            
//充值失败后 回滚元宝
//data: {uid: xx, fragment: xx, type: xx}
exchangeService.callbackPlayerFragment = function (data, cb) {
    userDao.updatePlayerFragment(data, cb);
}

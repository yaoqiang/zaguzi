
var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var open = require('../consts/open');
var shopConf = require('../../config/data/shop');
var Code = require('../../../shared/code');

var logger = require('log4js').getLogger(consts.LOG.PAYMENT);

var Promise = require('promise');

var mongojs = require('mongojs');

var pingpp = require('pingpp')(open.PAYMENT.PINGXX.testSecretKey);

var playerService = require('./playerService');
var commonDao = require('../dao/commonDao');
var userDao = require('../dao/userDao');

var utils = require('../util/utils');

var paymentService = module.exports

paymentService.requestChargesPingxx = function (data, cb) {
    
    var orderSerialNumber = mongojs.ObjectId().toString();
    
    pingpp.charges.create({
        subject: data.subject,
        body: data.body,
        amount: data.amount * 100,
        order_no: orderSerialNumber,
        channel: data.channel,
        currency: "cny",
        client_ip: data.clientIp,
        app: { id: appConf.payment.pingxx.appid }
    }, function (err, charge) {
        // YOUR CODE
        if (err) {
            cb({code: Code.FAIL});
            return;
        }
        
        userDao.getPlayerByUid(data.uid, function(player) {
            var order = {
                uid: data.uid,
                orderSerialNumber: orderSerialNumber,
                productId: data.productId,
                amount: data.product.amount,
                state: consts.ORDER.STATE.PENDING,
                device: data.device,
                channel: data.channel,
                player: { nickName: player.nickName, avatar: player.avatar, summary: player.summary }
            }
            
            commonDao.saveOrUpdateOrder(order);
        
            cb({code: Code.OK, charge: charge});
        })
        
        
    });



}

paymentService.webhooksPingxx = function () {
    //
}

/**
 * 代表支付成功后最终回调, 用来处理玩家状态和订单状态
 * @param uid
 * @param productId
 * @param state
 * @param device
 * @param channel
 * @param cb
 */
paymentService.payment = function (order, charge, cb) {
    order.productId = parseInt(order.productId);
    //
    var product = _.findWhere(shopConf[order.device], { id: order.productId });
    if (product == undefined) {
        logger.error('支付后逻辑失败||%s||在服务器端没有找到该产品||%j', order.uid, { productId: order.productId, device: order.device, channel: order.channel });
        cb({ code: Code.FAIL });
        return;
    }

    playerService.getUserCacheByUid(order.uid, function (user) {
        //如果玩家在线, 走sync方式; 如果玩家下线(可能将来开通PC充值, 外部充值等), 直接操作DB
        if (user == null || _.isUndefined(user)) {
            logger.info("支付后逻辑||%s||玩家不在线, 转为离线处理||%j", order.uid, { productId: order.productId, device: order.device, channel: order.channel });
            //
        }
        else {
            new Promise(function (resolve, reject) {
                //添加金币
                if (product.gold > 0) {
                    user.player.addGold(consts.GLOBAL.ADD_GOLD_TYPE.RECHARGE, product.gold, function (data) {
                        if (data.code === Code.OK) {
                            resolve(data);
                        } else {
                            reject({ code: Code.FAIL });
                        }
                    });
                } else {
                    resolve({ code: Code.OK });
                }
            })
                .then(function (gold) {
                    //添加物品
                    if (product.items.length > 0) {
                        user.player.addItems(consts.GLOBAL.ADD_ITEM_TYPE.RECHARGE, product.items, function (data) {
                            if (data.code === Code.OK) {
                                Promise.resolve(data);
                            }
                            else {
                                Promise.reject({ code: Code.FAIL });
                            }
                        });

                    } else {
                        Promise.resolve({ code: Code.OK });
                    }

                }, function (err) {
                    logger.error("支付后逻辑失败||%s||金币添加失败||%j", order.uid, { productId: order.productId, device: order.device, channel: order.channel });

                    utils.invokeCallback(cb, err, null);
                    return;
                })
                .then(function (items) {
                    //存储订单
                    var order = {
                        uid: uid,
                        orderSerialNumber: charge == null ? mongojs.ObjectId().toString() : charge.order_no,
                        productId: order.productId,
                        amount: product.amount,
                        state: order.state,
                        device: order.device,
                        channel: order.channel,
                        player: { nickName: user.player.nickName, avatar: user.player.avatar, summary: user.player.summary },
                        charge: charge
                    }
                    commonDao.saveOrUpdateOrder(order, charge, function (err, o) {
                        if (err) {
                            Promise.reject({ code: Code.FAIL });
                        }
                        else {
                            Promise.resolve({ code: Code.OK });
                        }
                    })
                }, function (err) {
                    logger.error("支付后逻辑失败||%s||物品添加失败||%j", order.uid, { productId: order.productId, device: order.device, channel: order.channel });
                    //Note: 回滚已添加的金币
                    //
                    utils.invokeCallback(cb, err, null);
                    return;
                })
                .then(function (order) {
                    user.player.save();
                    user.player.saveItem();
                    utils.invokeCallback(cb, null, null);
                }, function (err) {
                    logger.error("支付后逻辑失败||%s||订单记录创建失败||%j", order.uid, { productId: order.productId, device: order.device, channel: order.channel });
                    //Note: 回滚已添加的金币和物品
                    //
                    utils.invokeCallback(cb, err, null);
                });

        }
    });



}
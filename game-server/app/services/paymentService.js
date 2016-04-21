
var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var open = require('../consts/open');
var shopConf = require('../../config/data/shop');
var Code = require('../../../shared/code');

var logger = require('log4js').getLogger(consts.LOG.PAYMENT);

var Promise = require('promise');

var mongojs = require('mongojs');

var pingpp = require('pingpp')(open.PAYMENT.PINGPP.testSecretKey);
pingpp.setPrivateKeyPath(__dirname + "/../../config/rsa_private_key.pem");

var messageService = require('./messageService');

var playerService = require('./playerService');
var commonDao = require('../dao/commonDao');
var userDao = require('../dao/userDao');

var utils = require('../util/utils');
var dispatcher = require('../util/dispatcher').dispatch;

var paymentService = module.exports

/**
 * 生成ping++ charge对象,
 * data: {productId: xx, clientIp: xx, device: xx, channel: xx}
 */
paymentService.requestChargesPingxx = function (data, cb) {

    data.productId = parseInt(data.productId);
    //
    var product = _.findWhere(shopConf[data.device], { id: data.productId });
    if (product == undefined) {
        logger.debug('请求支付charge失败||%s||在服务器端没有找到该产品||%j', data.uid, { productId: data.productId, device: data.device, channel: data.channel });
        cb({ code: Code.FAIL });
        return;
    }

    var orderSerialNumber = mongojs.ObjectId().toString();

    try {
        pingpp.charges.create({
            subject: product.title,
            body: product.title,
            amount: product.amount * 100,
            order_no: orderSerialNumber,
            channel: data.channel,
            currency: "cny",
            client_ip: data.clientIp,
            app: { id: open.PAYMENT.PINGPP.appid }
        }, function (err, charge) {
            // YOUR CODE
            if (err) {
                cb({code: Code.FAIL});
                return;
            }

            userDao.getPlayerByUid(data.uid, function(err, player) {
                var order = {
                    uid: data.uid,
                    orderSerialNumber: orderSerialNumber,
                    productId: data.productId,
                    amount: product.amount,
                    state: consts.ORDER.STATE.PENDING,
                    device: data.device,
                    channel: data.channel,
                    player: { nickName: player.nickName, avatar: player.avatar, summary: player.summary }
                }

                commonDao.saveOrUpdateOrder(order, null, function () {

                });

                cb({code: Code.OK, charge: charge});
            })


        });
    } catch (e) {
        cb({code: Code.FAIL});
    }


}


/**
 * 代表支付成功后最终回调, 用来处理玩家状态和订单状态
 * @param order
 * @param charge
 * @param cb
 */
paymentService.payment = function (order, charge, cb) {
    var connectors = pomelo.app.getServersByType('connector');
    order.productId = parseInt(order.productId);
    //

    var orderSerialNumber = "";
    if (charge != null) {
        orderSerialNumber = charge.order_no;
    }

    playerService.getUserCacheByUid(order.uid, function (user) {

        var product = _.findWhere(shopConf[order.device], { id: order.productId });
        if (product == undefined) {
            logger.error("%j", {
                uid: order.uid,
                orderSerialNumber: orderSerialNumber,
                type: consts.LOG.CONF.PAYMENT,
                action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                message: '支付成功后逻辑处理失败, 在服务器端没有找到该产品',
                created: new Date(),
                detail: {order: order, charge: charge}
            });
            cb({ code: Code.FAIL }, null);

            if (user) {
                messageService.pushMessageToPlayer({
                    uid: order.uid,
                    sid: dispatcher(order.uid, connectors).id
                }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
            }
            return;
        }

        //if-如果玩家下线(可能将来开通PC充值, 外部充值等), 直接操作DB；；
        //else-如果玩家在线, 走sync方式; (else)
        if (user == null || _.isUndefined(user)) {
            logger.debug("支付后逻辑||%s||玩家不在线, 转为离线处理||%j", order.uid, { productId: order.productId, device: order.device, channel: order.channel });
            //
            new Promise(function (resolve, reject) {
                if (product.gold > 0) {
                    userDao.updatePlayerGold({uid: order.uid, gold: product.gold, type: consts.GLOBAL.ADD_GOLD_TYPE.RECHARGE}, function (err, doc) {
                        if (err) {
                            reject({code: Code.FAIL})
                        }
                        resolve({ code: Code.OK });
                    });
                }
                resolve({ code: Code.OK });
            })
                .then(function (ok) {
                    if (product.items.length > 0) {
                        userDao.updatePlayerItems({uid: order.uid, items: product.items, type: consts.GLOBAL.ADD_GOLD_TYPE.RECHARGE}, function (err, doc) {
                            if (err) {
                                Promise.reject({code: Code.FAIL})
                                return;
                            }
                            Promise.resolve({ code: Code.OK });
                        });
                    }
                    Promise.resolve({ code: Code.OK });

                }, function (err) {
                    logger.error("%j", {
                        uid: order.uid,
                        orderSerialNumber: orderSerialNumber,
                        type: consts.LOG.CONF.PAYMENT,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: '支付成功后逻辑处理失败, 金币添加失败',
                        created: new Date(),
                        detail: {order: order, charge: charge}
                    });
                    utils.invokeCallback(cb, err, null);
                    return;
                })
                .then(function (ok) {

                    userDao.getPlayerByUid(order.uid, function (err, player) {
                        if (err) {
                            logger.error("%j", {
                                uid: order.uid,
                                orderSerialNumber: orderSerialNumber,
                                type: consts.LOG.CONF.PAYMENT,
                                action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                                message: '支付成功后逻辑处理失败, 获取玩家信息异常',
                                created: new Date(),
                                detail: {order: order, charge: charge, err: err}
                            });
                            Promise.reject({ code: Code.FAIL });
                        }
                        //存储订单
                        var orderData = {
                            uid: order.uid,
                            orderSerialNumber: charge == null ? mongojs.ObjectId().toString() : charge.order_no,
                            productId: order.productId,
                            amount: product.amount,
                            state: order.state,
                            device: order.device,
                            channel: order.channel,
                            transactionId: order.transactionId,
                            certificate: order.certificate,
                            player: { nickName: player.nickName, avatar: player.avatar, summary: player.summary }
                        }

                        commonDao.saveOrUpdateOrder(orderData, charge, function (err, o) {
                            logger.debug("commonDao.saveOrUpdateOrder -> %j", {err: err, o: o});
                            if (err) {
                                Promise.reject({ code: Code.FAIL });
                            }
                            else {
                                Promise.resolve({ code: Code.OK });
                            }
                        });
                    });

                }, function (err) {
                    logger.error("%j", {
                        uid: order.uid,
                        orderSerialNumber: orderSerialNumber,
                        type: consts.LOG.CONF.PAYMENT,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: '支付成功后逻辑处理失败, 订单修改失败',
                        created: new Date(),
                        detail: {order: order, charge: charge}
                    });
                    utils.invokeCallback(cb, err, null);
                    return;
                })
                .then(function (ok) {
                    logger.info("%j", {
                        uid: order.uid,
                        orderSerialNumber: orderSerialNumber,
                        type: consts.LOG.CONF.PAYMENT,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: '支付成功后逻辑处理成功',
                        created: new Date(),
                        detail: {order: order, charge: charge}
                    });
                    utils.invokeCallback(cb, null, {code: Code.OK});
                }, function (err) {
                    logger.error("%j", {
                        uid: order.uid,
                        orderSerialNumber: orderSerialNumber,
                        type: consts.LOG.CONF.PAYMENT,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: '支付成功后逻辑处理失败-订单数据处理失败',
                        created: new Date(),
                        detail: {order: order, charge: charge}
                    });
                    utils.invokeCallback(cb, err, null);
                })

        }
        //玩家在线情况处理
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
                    logger.error("%j", {
                        uid: order.uid,
                        orderId: charge.order_no,
                        type: consts.LOG.CONF.PAYMENT,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: '支付成功后逻辑处理失败, 金币添加失败',
                        created: new Date(),
                        detail: {order: order, charge: charge}
                    });

                    //send message
                    messageService.pushMessageToPlayer({
                        uid: order.uid,
                        sid: dispatcher(order.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});

                    utils.invokeCallback(cb, err, null);
                    return;
                })
                .then(function (items) {
                    //存储订单
                    var orderData = {
                        uid: order.uid,
                        //如果是pingpp支付则有预先创建订单, 订单号在charge里; 如果是IAP,则没有预先创建订单, 订单号及时生成
                        orderSerialNumber: charge == null ? mongojs.ObjectId().toString() : charge.order_no,
                        productId: order.productId,
                        amount: product.amount,
                        state: order.state,
                        device: order.device,
                        channel: order.channel,
                        transactionId: order.transactionId,
                        certificate: order.certificate,
                        player: { nickName: user.player.nickName, avatar: user.player.avatar, summary: user.player.summary }
                    }
                    commonDao.saveOrUpdateOrder(orderData, charge, function (err, o) {
                        logger.debug("commonDao.saveOrUpdateOrder -> %j", {err: err, o: o});
                        if (err) {
                            Promise.reject({ code: Code.FAIL });
                        }
                        else {
                            Promise.resolve({ code: Code.OK });
                        }
                    })
                }, function (err) {
                    logger.error("%j", {uid: order.uid, type: consts.LOG.CONF.PAYMENT.TYPE, action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: '支付成功后逻辑处理失败, 物品添加失败', created: new Date(), detail: {productId: order.productId, device: order.device, channel: order.channel}});
                    //Note: 回滚已添加的金币
                    user.player.addGold(consts.GLOBAL.ADD_ITEM_TYPE.RECHARGE_ROLLBACK, product.gold, function (rollBackData) {
                        logger.info("%j", {uid: order.uid, type: consts.LOG.CONF.PAYMENT.TYPE, action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                            message: '支付成功后物品添加失败失败-回滚金币成功', created: new Date(), detail: { productId: order.productId, gold: product.gold, device: order.device, channel: order.channel }});
                    });
                    utils.invokeCallback(cb, err, null);

                    //send message
                    messageService.pushMessageToPlayer({
                        uid: order.uid,
                        sid: dispatcher(order.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                    return;
                })
                .then(function (orderResult) {
                    user.player.save();
                    user.player.saveItem();
                    //send message
                    messageService.pushMessageToPlayer({
                        uid: order.uid,
                        sid: dispatcher(order.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.OK});

                    utils.invokeCallback(cb, null, null);
                }, function (err) {
                    logger.error("%j", {uid: order.uid, type: consts.LOG.CONF.PAYMENT.TYPE, action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: '支付成功后订单记录修改失败', created: new Date(), detail: {productId: order.productId, device: order.device, channel: order.channel}});
                    //Note: 回滚已添加的金币和物品
                    user.player.addGold(consts.GLOBAL.ADD_ITEM_TYPE.RECHARGE_ROLLBACK, product.gold, function (rollBackData) {
                        logger.error("%j", {uid: order.uid, type: consts.LOG.CONF.PAYMENT.TYPE, action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                            message: '支付成功后订单修改失败-回滚金币成功', created: new Date(), detail: { productId: order.productId, gold: product.gold, device: order.device, channel: order.channel }});
                    });
                    user.player.addItems(consts.GLOBAL.ADD_ITEM_TYPE.RECHARGE, product.items, function (data) {
                        logger.error("%j", {uid: order.uid, type: consts.LOG.CONF.PAYMENT.TYPE, action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                            message: '支付成功后订单修改失败-回滚物品成功', created: new Date(), detail: { productId: order.productId, items: product.items, device: order.device, channel: order.channel }});
                    });
                    user.player.save();
                    user.player.saveItem();

                    //send message
                    messageService.pushMessageToPlayer({
                        uid: order.uid,
                        sid: dispatcher(order.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});

                    utils.invokeCallback(cb, err, null);
                });

        }
    });



}
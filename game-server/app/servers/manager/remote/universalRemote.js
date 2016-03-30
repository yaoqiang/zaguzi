var _ = require('lodash');

var Code = require('../../../../../shared/code');
var consts = require('../../../consts/consts');
var open = require('../../../consts/open');

var pomelo = require('pomelo');

var logger = require('log4js').getLogger(consts.LOG.USER);
var logger4payment = require('log4js').getLogger(consts.LOG.PAYMENT);

var utils = require('../../../util/utils');
var dispatcher = require('../../../util/dispatcher').dispatch;

var request = require('request');

var playerService = require('../../../services/playerService');
var openService = require('../../../services/openService');
var commonService = require('../../../services/commonService');
var exchangeService = require('../../../services/exchangeService');
var shopService = require('../../../services/shopService');
var paymentService = require('../../../services/paymentService');

var messageService = require('../../../services/messageService');


////////////////////////////////////////////
// 一些无状态接口
////////////////////////////////////////////

module.exports = function (app) {
    return new UniversalRemote(app);
};

var UniversalRemote = function (app) {
    this.app = app;
};

UniversalRemote.prototype = {

    getRankingList: function (data, cb) {
        commonService.getRankingList(data, cb);
    },

    //notify
    getTopOfAppReleaseRecord: function (data, cb) {
        commonService.getTopOfAppReleaseRecord(data, cb);
    },

    getSystemMessage: function (data, cb) {
        commonService.getSystemMessage(data, cb);
    },


    sendBindingSMS: function (data, cb) {
        playerService.getUserCacheByUid(data.uid, function (user) {
            if (user == null || _.isUndefined(user)) {
                logger.error("user-send SMS||%j||发送短信失败, 玩家不在线, 用户ID:%j", data.uid, data.uid)
                cb({code: Code.FAIL});
                return;
            }
            data.tplId = open.JUHE.SMS_API.TEMPLATE_ID.MOBILE_BINDING;
            openService.sendSMS(data, cb);
        });
    },

    bindingMobile: function (data, cb) {
        playerService.getUserCacheByUid(data.uid, function (user) {
            if (user == null || _.isUndefined(user)) {
                logger.error("user-binding mobile||%j||绑定失败, 玩家不在线, 用户ID:%j", data.uid, data.uid)
                cb({code: Code.FAIL});
                return;
            }
            commonService.bindingMobile(data, function (data) {
                //添加绑定手机金币奖励
                if (data.code == Code.OK) {
                    user.player.addGold(consts.GLOBAL.ADD_GOLD_TYPE.TASK, consts.GLOBAL.BINDING_MOBILE_GRANT, function () {

                    });
                }
                cb(data);
            });
        });
    },

    //////////////////////////////////
    // 兑换相关
    //////////////////////////////////
    getExchangeList: function (data, cb) {
        exchangeService.getExchangeList(data, cb);
    },

    getMyExchangeRecordList: function (data, cb) {
        exchangeService.getMyExchangeRecordList(data, cb);
    },

    exchange: function (data, cb) {
        exchangeService.exchange(data, cb);
    },

    /**
     * Apple IAP支付完成后调用, 以便存储订单
     */
    payment4IAP: function (data, cb) {

        //IAP服务器端支付凭证校验, NOTE: 线上需改为production环境
        var options = {
            method: open.APPLE_IAP.VERIFY_RECEIPT.METHOD,
            url: open.APPLE_IAP.VERIFY_RECEIPT.SANDBOX,
            headers: {
                'Content-type': 'application/json'
            },
            body: {
                'receipt-data': data.product.receiptCipheredPayload
            },
            json: true
        }

        request(options, function (err, response, body) {

            var connectors = pomelo.app.getServersByType('connector');

            var bodyJson = response.body;
            if (response.statusCode != Code.OK) {

                logger4payment.error("%j", {
                    uid: data.uid,
                    type: consts.LOG.CONF.PAYMENT.TYPE,
                    action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                    message: 'Apple Store Server验证时,HTTP失败',
                    created: new Date(),
                    detail: {productId: data.productId, device: 'ios'}
                });

                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: dispatcher(data.uid, connectors).id
                }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                cb();
                return;
            }
            if (bodyJson.status != open.APPLE_IAP.VERIFY_RECEIPT.OK_STATUS) {
                logger4payment.error("%j", {
                    uid: data.uid,
                    type: consts.LOG.CONF.PAYMENT.TYPE,
                    action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                    message: 'Apple Store Server验证时,RECEIPT失败(可能非法)',
                    created: new Date(),
                    detail: {productId: data.productId, device: 'ios'}
                });
                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: dispatcher(data.uid, connectors).id
                }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                cb();
                return;
            }

            //logger4payment.debug(response.body);

            var order = {
                uid: data.uid,
                productId: data.productId,
                state: consts.ORDER.STATE.FINISHED,
                device: 'ios',
                channel: 'IAP',
                charge: null
            }
            try {
                var transactionId = -1;
                if (response.body.receipt.in_app.length > 0) {
                    transactionId = response.body.receipt.in_app[0].transaction_id;
                }

                if (transactionId == -1) {
                    logger4payment.error("%j", {
                        uid: data.uid,
                        type: consts.LOG.CONF.PAYMENT.TYPE,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: 'Apple Store Receipt中没有transaction_id',
                        created: new Date(),
                        detail: {productId: data.productId, device: 'ios'}
                    });
                    messageService.pushMessageToPlayer({
                        uid: data.uid,
                        sid: dispatcher(data.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                    cb();
                    return;
                }
            } catch (error) {
                logger4payment.error("%j", {
                    uid: data.uid,
                    type: consts.LOG.CONF.PAYMENT.TYPE,
                    action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                    message: 'Apple Store Receipt中没有transaction_id',
                    created: new Date(),
                    detail: {productId: data.productId, device: 'ios'}
                });
                cb();
                return;
            }


            //根据receipt的transaction_id 查询已有订单是否存在, 如果存在并且已完成, 则认为是非法receipt
            commonService.searchOrderByTransactionId(transactionId, function (err, doc) {
                if (err || (doc && doc.state == consts.ORDER.STATE.FINISHED)) {

                    logger4payment.error("%j", {
                        uid: data.uid,
                        type: consts.LOG.CONF.PAYMENT.TYPE,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: 'Apple Store Receipt中transaction_id已使用, 可能是非法请求或漏单',
                        created: new Date(),
                        detail: {productId: data.productId, device: 'ios'}
                    });

                    messageService.pushMessageToPlayer({
                        uid: data.uid,
                        sid: dispatcher(data.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                    cb();
                    return;
                }

                order.transactionId = transactionId;

                paymentService.payment(order, null, function (err, result) {
                    if (err) {
                        logger4payment.error("%j", {
                            uid: data.uid,
                            type: consts.LOG.CONF.PAYMENT.TYPE,
                            action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                            message: '充值成功后, 处理商品失败',
                            created: new Date(),
                            detail: {productId: data.productId, device: 'ios'}
                        });

                        return;
                    }
                    logger4payment.info("%j", {
                        uid: data.uid,
                        type: consts.LOG.CONF.PAYMENT.TYPE,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: '充值成功, 并完成商品添加',
                        created: new Date(),
                        detail: {productId: data.productId, device: 'ios'}
                    });


                    cb();
                });
            })


        });

    },

    /**
     * 当客户端支付失败或取消支付时, 维护订单状态并通知客户端, 失败不会走webhook(只有成功才回调)
     * @param data: {uid: xx, state: xx} state: success, fail, cancel, invalid
     * @param cb
     */
    payment4PingppFromClient: function (data, cb) {
        var connectors = pomelo.app.getServersByType('connector');
        commonService.searchLastOrderByUid(data.uid, function (err, originalOrder) {
            logger4payment.debug("debug info -> %j", {err: err, originalOrder: originalOrder});
            if (err) {
                logger4payment.error("%j", {
                    uid: data.uid,
                    orderSerialNumber: data.order_no,
                    type: consts.LOG.CONF.PAYMENT,
                    action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                    message: 'Pingpp Webhooks参数中order_no 未找到订单',
                    created: new Date(),
                    detail: {data: data}
                });
                cb({code: Code.FAIL});
                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: dispatcher(data.uid, connectors).id
                }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                return;
            }

            if (originalOrder == null) {
                logger4payment.error("%j", {
                    uid: data.uid,
                    orderSerialNumber: data.order_no,
                    type: consts.LOG.CONF.PAYMENT,
                    action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                    message: 'Pingpp Webhooks参数中order_no 未找到订单',
                    created: new Date(),
                    detail: {data: data}
                });
                cb({code: Code.FAIL});
                //NOTE: 暂时去掉消息, 如果玩家取消支付或支付失败, 统一不处理.
                // messageService.pushMessageToPlayer({
                //     uid: data.uid,
                //     sid: dispatcher(data.uid, connectors).id
                // }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                return;
            }


            var state = consts.ORDER.STATE.PAYMENT_FAILED;
            if (data.state === 'cancel') {
                state = consts.ORDER.STATE.CANCELED;
            }
            //如果支付失败, 则只设置订单状态即可
            commonService.setOrderStateByNumber(originalOrder.orderSerialNumber, state, data, function (err, doc) {
                if (err || doc == null) {
                    logger4payment.error("%j", {
                        uid: originalOrder.uid,
                        orderSerialNumber: data.order_no,
                        type: consts.LOG.CONF.PAYMENT,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: 'pingpp客户端取消支付或支付失败后向服务器上报订单信息, 处理订单状态异常',
                        created: new Date(),
                        detail: {data: data}
                    });
                    cb({code: Code.FAIL});

                }
                else {
                    logger4payment.info("%j", {
                        uid: originalOrder.uid,
                        orderSerialNumber: data.order_no,
                        type: consts.LOG.CONF.PAYMENT.TYPE,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: 'pingpp客户端取消支付或支付失败后向服务器上报订单信息, 处理订单状态成功',
                        created: new Date(),
                        detail: {data: data}
                    });
                    cb({code: Code.OK});
                }
                
                logger4payment.debug("#call service finished, will send message to client");

                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: dispatcher(data.uid, connectors).id
                }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});

            });

        })

    },

    /**
     * * ping++支付成功回调（Webhooks）
     * @param data: charge
     * @param cb
     */
    payment4Pingpp: function (data, cb) {

        try {

            var connectors = pomelo.app.getServersByType('connector');

            commonService.searchOrderByNumber(data.order_no, function (err, originalOrder) {
                logger4payment.debug("debug info -> %j", {err: err, originalOrder: originalOrder});
                if (err) {
                    logger4payment.error("%j", {
                        uid: undefined,
                        orderSerialNumber: data.order_no,
                        type: consts.LOG.CONF.PAYMENT,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: 'Pingpp Webhooks参数中order_no 未找到订单',
                        created: new Date(),
                        detail: {data: data}
                    });
                    cb({code: Code.FAIL});
                    return;
                }

                if (originalOrder == null) {
                    logger4payment.error("%j", {
                        uid: undefined,
                        orderSerialNumber: data.order_no,
                        type: consts.LOG.CONF.PAYMENT,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: 'Pingpp Webhooks参数中order_no 未找到订单',
                        created: new Date(),
                        detail: {data: data}
                    });
                    cb({code: Code.FAIL});
                    return;
                }

                //use in payment service: NOTE: date.paid是pingpp回调参数(true/false)
                var order = {
                    uid: originalOrder.uid,
                    productId: originalOrder.productId,
                    state: data.paid == true ? consts.ORDER.STATE.FINISHED : consts.ORDER.STATE.PAYMENT_FAILED,
                    device: originalOrder.device,
                    channel: originalOrder.channel
                };

                //如果支付失败, 则只设置订单状态即可
                if (order.state == consts.ORDER.STATE.PAYMENT_FAILED) {
                    commonService.setOrderStateByNumber(data.order_no, order.state, data, function (err, doc) {
                        if (err || doc == null) {
                            logger4payment.info("%j", {
                                uid: originalOrder.uid,
                                orderSerialNumber: data.order_no,
                                type: consts.LOG.CONF.PAYMENT,
                                action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                                message: 'pingpp返回支付失败后, 业务系统处理订单状态异常',
                                created: new Date(),
                                detail: {data: data}
                            });
                            cb({code: Code.FAIL});
                        }
                        else {
                            cb({code: Code.OK});
                        }
                    });

                    messageService.pushMessageToPlayer({
                        uid: originalOrder.uid,
                        sid: dispatcher(originalOrder.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL, err: consts.ERR_CODE.NEED_CUSTOMER});
                    return;
                }

                //order: Mongo中的订单数据, data: pingpp的charge数据
                paymentService.payment(order, data,
                    function (err, result) {
                        if (err) {
                            //在paymentService.payment中已发送消息
                            //messageService.pushMessageToPlayer({
                            //    uid: originalOrder.uid,
                            //    sid: dispatcher(originalOrder.uid, connectors).id
                            //}, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL, err: consts.ERR_CODE.NEED_CUSTOMER});
                            cb({code: Code.FAIL});
                            return;
                        }
                        logger4payment.info("%j", {
                            uid: originalOrder.uid,
                            orderSerialNumber: data.order_no,
                            type: consts.LOG.CONF.PAYMENT,
                            action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                            message: '支付成功后逻辑处理成功',
                            created: new Date(),
                            detail: {data: data}
                        });

                        cb({code: Code.OK});
                    });
            })
        } catch (error) {

            logger4payment.error("%j", {
                uid: undefined,
                orderSerialNumber: data.order_no,
                type: consts.LOG.CONF.PAYMENT,
                action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                message: 'Pingpp Webhooks处理异常',
                created: new Date(),
                detail: {error: error}
            });
            cb({code: Code.FAIL});
        }


    },

    /**
     * 为运营平台提供人工充值（场景：支付宝、微信、银行转账成功后，为玩家添加物品）
     * 支付成功后, 处理后续逻辑；certificate：相关凭证（如果是客户转账, OSS平台必须上传转账截图或交易流水和玩家信息）
     * data: {uid: xx, productId: xx, certificate: xx}
     */
    payment4OSS: function (data, cb) {
        //初始化订单信息
        var order = {
            uid: data.uid,
            productId: data.productId,
            state: consts.ORDER.STATE.FINISHED,
            device: data.device,
            channel: 'oss',
            charge: null,
            certificate: data.certificate
        }

        //处理支付成功后续逻辑
        paymentService.payment(order, null, function (err, result) {
            if (err) {
                logger4payment.error("%j", {
                    uid: data.uid,
                    type: consts.LOG.CONF.PAYMENT.TYPE,
                    action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                    message: '充值成功后, 处理商品失败 - 人工充值',
                    created: new Date(),
                    detail: {productId: data.productId}
                });

                cb({code: Code.FAIL});
                return;
            }
            logger4payment.info("%j", {
                uid: data.uid,
                type: consts.LOG.CONF.PAYMENT.TYPE,
                action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                message: '充值成功, 并完成商品添加',
                created: new Date(),
                detail: {productId: data.productId, device: 'ios'}
            });

            cb({code: Code.OK});
        });

    },

    /**
     * 客户端请求支付，获取ping++支付凭证
     */
    requestPaymentByPingpp: function (data, cb) {
        paymentService.requestChargesPingxx(data, cb);
    },


    getShopList: function (data, cb) {
        cb({code: Code.OK, shopList: shopService.getShopList(data.device)});
    },


    //处理话费充值回调
    // data: ↓
    // state         string     充值状态（0为充值中 1为成功 其他为失败）
    // orderid       string     商家订单号 
    // ordertime     string     订单处理时间 (格式为：yyyyMMddHHmmss  如：20150323140214）)
    // sign          string     32位小写md5签名：md5(apix-key + orderid+ ordertime)
    // err_msg       string     充值失败时候返回失败信息。成功时为空。
    mobileRechargeHandler: function (data, cb) {
        logger.debug('-- mobileRechargeHandler -- %o', data);

        //如果失败，先查询是否订单存在
        exchangeService.getExchangeRecordByNumber(data.orderid, function (err, exchangeRecord) {
            if (err) {
                logger.info("%j", {
                    uid: exchangeRecord.uid,
                    type: consts.LOG.CONF.OPEN_API.TYPE,
                    action: consts.LOG.CONF.OPEN_API.APIX_CALLBACK,
                    message: '处理APIX回调时, 未根据订单号查到兑换记录',
                    created: new Date(),
                    detail: {exchangeId: data.orderid}
                });
                cb();
                return;
            }

            //CANCELED状态可能后续 预留给客服操作预留
            if (exchangeRecord.state == consts.ORDER.STATE.CANCELED) {
                logger.info("%j", {
                    uid: exchangeRecord.uid,
                    type: consts.LOG.CONF.OPEN_API.TYPE,
                    action: consts.LOG.CONF.OPEN_API.APIX_CALLBACK,
                    message: '处理APIX回调时, 该兑换记录已处理过',
                    created: new Date(),
                    detail: {exchangeId: data.orderid}
                });
                cb();
                return;
            }

            //如果设置回调, 回调结果是成功, 则不处理; 如果失败, 则为玩家恢复元宝
            //因为如果第一次调用APIX返回失败就不会扣除元宝, 如果APIX返回成功, 则直接扣除了元宝（但是未必真正充值成功）
            if (data.state == 1 || data.state == 0) {
                logger.info("%j", {
                    uid: exchangeRecord.uid,
                    type: consts.LOG.CONF.OPEN_API.TYPE,
                    action: consts.LOG.CONF.OPEN_API.APIX_CALLBACK,
                    message: '处理APIX回调时, 已为玩家成功充值, 无需再处理',
                    created: new Date(),
                    detail: {exchangeId: data.orderid}
                });
                cb();
                return;
            }

            //如果回调显示充值失败, 则为玩家回滚元宝. 获取兑换产品信息
            exchangeService.getExchangeListById(exchangeRecord._id, function (err, exchangeItem) {
                //查询玩家是否在线
                playerService.getUserCacheByUid(exchangeRecord.uid, function (user) {
                    //如果玩家不在线，则直接操作DB更新
                    if (user == null || _.isUndefined(user)) {
                        exchangeService.callbackPlayerFragment({
                            uid: exchangeRecord.uid,
                            fragment: -exchangeItem.fragment
                        }, function (err, p) {
                            if (err) {
                                logger.error("%j", {
                                    uid: exchangeRecord.uid,
                                    type: consts.LOG.CONF.OPEN_API.TYPE,
                                    action: consts.LOG.CONF.OPEN_API.APIX_CALLBACK,
                                    message: '处理APIX充值失败回调异常',
                                    created: new Date(),
                                    detail: {exchangeId: data.orderid, err: err}
                                });
                            } else {
                                logger.info("%j", {
                                    uid: exchangeRecord.uid,
                                    type: consts.LOG.CONF.OPEN_API.TYPE,
                                    action: consts.LOG.CONF.OPEN_API.APIX_CALLBACK,
                                    message: '处理APIX充值失败后 回滚元宝成功',
                                    created: new Date(),
                                    detail: {exchangeId: data.orderid}
                                });
                            }
                        });
                    }
                    //如果玩家在线，则通过pomelo-sync处理并向客户端发送元宝变化事件
                    else {
                        user.player.addFragment(consts.GLOBAL.ADD_FRAGMENT_TYPE.EXCHANGE_FAILED_RETURN, -exchangeItem.fragment, function (fragment) {
                            //TODO 可以通过UI_COMMAND发送兑换模块有新状态
                        })
                    }
                });
                cb()
            });

        });


    }
}
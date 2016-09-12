var _ = require('lodash');

var Code = require('../../../../../shared/code');
var consts = require('../../../consts/consts');
var open = require('../../../consts/open');

var itemConf = require('../../../../config/data/item');
var lotteryItemConf = require('../../../../config/data/lottery');
var globals = require('../../../../config/data/globals');


var pomelo = require('pomelo-rt');

var logger = require('log4js').getLogger(consts.LOG.USER);
var logger4payment = require('log4js').getLogger(consts.LOG.PAYMENT);

var utils = require('../../../util/utils');
var dispatcher = require('../../../util/dispatcher').dispatch;

var request = require('request');

var Promise = require('promise');

var playerService = require('../../../services/playerService');
var openService = require('../../../services/openService');
var commonService = require('../../../services/commonService');
var exchangeService = require('../../../services/exchangeService');
var shopService = require('../../../services/shopService');
var paymentService = require('../../../services/paymentService');

var messageService = require('../../../services/messageService');

//
var lottery = require('../../../domain/entity/lottery');


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

    getOnlineUserList: function(data, cb) {
        cb(pomelo.app.userCache);
    },

    getRankingList: function (data, cb) {
        commonService.getRankingList(data, cb);
    },

    //notify
    getTopOfAppReleaseRecord: function (data, cb) {
        commonService.getTopOfAppReleaseRecord(data, cb);
    },

    //notify
    getLastApp: function (data, cb) {
        commonService.getLastApp(data, cb);
    },

    getSystemMessage: function (data, cb) {
        commonService.getSystemMessage(data, cb);
    },

    getLastSystemMessageDate: function (data, cb) {
        commonService.getLastSystemMessageDate(data, cb);
    },

    /**
     * @param data: {uid: String, mobile: String}
     */
    sendBindingSMS: function (data, cb) {
        playerService.getUserCacheByUid(data.uid, function (user) {
            if (user == null || _.isUndefined(user)) {
                logger.debug("user-send SMS||%j||发送短信失败, 玩家不在线, 用户ID:%j", data.uid, data.uid)
                cb({code: Code.FAIL});
                return;
            }
            data.tplId = open.JUHE.SMS_API.TEMPLATE_ID.MOBILE_BINDING;
            openService.sendBindingSMS(data, cb);
        });
    },
    
    /**
     * @param data: {uid: String, mobile: String}
     */
    sendResetPasswordSMS: function (data, cb) {
        data.tplId = open.JUHE.SMS_API.TEMPLATE_ID.RESET_PASSWORD;
        openService.sendResetPasswordSMS(data, cb);
    },

    /**
     * @param data: {uid: String, mobile: String}
     */
    bindingMobile: function (data, cb) {
        playerService.getUserCacheByUid(data.uid, function (user) {
            if (user == null || _.isUndefined(user)) {
                logger.debug("user-binding mobile||%j||绑定失败, 玩家不在线, 用户ID:%j", data.uid, data.uid)
                cb({code: Code.FAIL});
                return;
            }
            commonService.bindingMobile(data, function (data) {
                //添加绑定手机金币奖励
                if (data.code == Code.OK) {
                    user.player.addGold(consts.GLOBAL.ADD_GOLD_TYPE.TASK, globals.bindingMobileGrant, function () {

                    });
                }
                cb(data);
            });
        });
    },
    
    /**
     * @param data: { captcha: String, mobile: String, password: String }
     */
    resetPassword: function (data, cb) {
        commonService.resetPassword(data, cb);
    },

    //////////////////////////////////
    // 兑换相关
    //////////////////////////////////
    getExchangeList: function (data, cb) {
        exchangeService.getExchangeList(data, cb);
    },

    //新版兑换列表
    //data: {os: ios/android};
    getExchangeListNew: function (data, cb) {

        exchangeService.listExchangeListNew(data, cb);
    },

    getMyExchangeRecordList: function (data, cb) {
        exchangeService.getMyExchangeRecordList(data, cb);
    },

    exchange: function (data, cb) {
        exchangeService.exchange(data, cb);
    },

    getInviteRecordListByUid: function (data, cb) {
        commonService.getInviteRecordListByUid(data, cb);
    },
    /**
     * Apple IAP支付完成后调用, 以便存储订单
     * IAP错误代码信息（方便查阅）
     * 21000 - The App Store could not read the JSON object you provided.
     * 21002 - The data in the receipt-data property was malformed or missing.
     * 21003 - The receipt could not be authenticated.
     * 21004 - The shared secret you provided does not match the shared secret on file for your account. Only returned for iOS 6 style transaction receipts for auto-renewable subscriptions.
     * 21005 - The receipt server is not currently available.
     * 21006 - This receipt is valid but the subscription has expired. When this status code is returned to your server, the receipt data is also decoded and returned as part of the response. Only returned for iOS 6 style transaction receipts for auto-renewable subscriptions.
     * 21007 - This receipt is from the test environment, but it was sent to the production environment for verification. Send it to the test environment instead.
     * 21008 - This receipt is from the production environment, but it was sent to the test environment for verification. Send it to the production environment instead.
     */
    payment4IAP: function (data, cb) {
        var self = this;

        //IAP服务器端支付凭证校验, NOTE: 优先从Production验证, 如果得到Code=21007 则去Sandbox再验证
        //官方推荐做法，这样可以不需要硬编码或设置动态开关
        //see: https://developer.apple.com/library/ios/releasenotes/General/ValidateAppStoreReceipt/Chapters/ValidateRemotely.html
        var optionsProduction = {
            method: open.APPLE_IAP.VERIFY_RECEIPT.METHOD,
            url: open.APPLE_IAP.VERIFY_RECEIPT.PRODUCTION,
            headers: {
                'Content-type': 'application/json'
            },
            body: {
                'receipt-data': data.product.receiptCipheredPayload
            },
            json: true
        }
        
        var optionsSandbox = {
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

        //请求Production验证Receipt
        request(optionsProduction, function (err, responseProduction, bodyProduction) {

            var connectors = pomelo.app.getServersByType('connector');

            var bodyJsonProduction = responseProduction.body;
            //如果http状态错误
            if (responseProduction.statusCode != Code.OK) {

                logger4payment.error("%j", {
                    uid: data.uid,
                    type: consts.LOG.CONF.PAYMENT.TYPE,
                    action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                    message: 'Apple Store Server验证时,HTTP失败-可能导致在Apple玩家已真实付款,而客户端或服务器端网络极差导致物品未到账',
                    created: new Date(),
                    detail: {productId: data.productId, device: 'ios'}
                });

                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: dispatcher(data.uid, connectors).id
                }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                cb({code: Code.FAIL});
                return;
            }
            
            //如果Production没有返回成功
            if (bodyJsonProduction.status != open.APPLE_IAP.VERIFY_RECEIPT.OK_STATUS) {
                
                //如果是在Production没有找到Receipt，并且苹果返回确定Receipt是Sandbox，则去Sandbox验证（为apple上线审核）
                if (bodyJsonProduction.status === open.APPLE_IAP.VERIFY_RECEIPT.USE_SANDBOX_IN_PRODUCTION) {
                    //请求Sandbox验证Receipt
                    request(optionsSandbox, function (err, responseSandbox, bodySandbox) {
                        var bodyJsonSandbox = responseSandbox.body;
                        //如果http状态错误
                        if (responseSandbox.statusCode != Code.OK) {

                            logger4payment.error("%j", {
                                uid: data.uid,
                                type: consts.LOG.CONF.PAYMENT.TYPE,
                                action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                                message: 'Apple Store Server验证时,HTTP失败-可能导致在Apple玩家已真实付款,而客户端或服务器端网络极差导致物品未到账',
                                created: new Date(),
                                detail: {productId: data.productId, device: 'ios'}
                            });

                            messageService.pushMessageToPlayer({
                                uid: data.uid,
                                sid: dispatcher(data.uid, connectors).id
                            }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                            cb({code: Code.FAIL});
                            return;
                        }
                        
                        //如果Sandbox没有返回成功
                        if (bodyJsonSandbox.status != open.APPLE_IAP.VERIFY_RECEIPT.OK_STATUS) {
                            logger4payment.error("%j", {
                                uid: data.uid,
                                type: consts.LOG.CONF.PAYMENT.TYPE,
                                action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                                message: 'Apple Store Server验证时,RECEIPT失败(可能非法)',
                                created: new Date(),
                                detail: {productId: data.productId, device: 'ios', statusCode: bodyJsonSandbox.status}
                            });
                            messageService.pushMessageToPlayer({
                                uid: data.uid,
                                sid: dispatcher(data.uid, connectors).id
                            }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                            //返回客户端非法凭证, 客户端将该凭证从本地存储移除, 不再后续继续重试
                            cb({code: Code.FAIL, detail: Code.PAYMENT.INVALID_RECEIPT});
                            return;
                        }

                        self.payment4IAPProcessOrder(data, responseSandbox, connectors, cb);
                        
                    });
                    
                }
                else {
                    logger4payment.error("%j", {
                        uid: data.uid,
                        type: consts.LOG.CONF.PAYMENT.TYPE,
                        action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                        message: 'Apple Store Server验证时,RECEIPT失败(可能非法)',
                        created: new Date(),
                        detail: {productId: data.productId, device: 'ios', statusCode: bodyJsonProduction.status}
                    });
                    messageService.pushMessageToPlayer({
                        uid: data.uid,
                        sid: dispatcher(data.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                    cb({code: Code.FAIL});
                }
                return;
            }

            self.payment4IAPProcessOrder(data, responseProduction, connectors, cb);

        });

    },
    
    //因production和sandbox后续处理是一样的，所以封装公用代码
    payment4IAPProcessOrder: function (data, response, connectors, cb) {
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
                //返回客户端非法凭证, 客户端将该凭证从本地存储移除, 不再后续继续重试
                cb({code: Code.FAIL, detail: Code.PAYMENT.INVALID_RECEIPT});
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
            //返回客户端非法凭证, 客户端将该凭证从本地存储移除, 不再后续继续重试
            cb({code: Code.FAIL, detail: Code.PAYMENT.INVALID_RECEIPT});
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
                //返回客户端非法凭证, 客户端将该凭证从本地存储移除, 不再后续继续重试
                cb({code: Code.FAIL, detail: Code.PAYMENT.INVALID_RECEIPT});
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
                    cb();
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
                        type: consts.LOG.CONF.PAYMENT.TYPE,
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
                type: consts.LOG.CONF.PAYMENT.TYPE,
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
                detail: {productId: data.productId, device: data.device}
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
        cb({code: Code.OK, shopList: shopService.getShopList(data.device, data.type)});
    },
    
    getItemList: function (data, cb) {
        cb({code: Code.OK, itemList: itemConf});
    },

    /**
     * 获取玩家的抽奖卡数量和抽奖金币费用
     * @param data
     * @param cb
     */
    getLotteryCard: function (data, cb) {
        playerService.getUserCacheByUid(data.uid, function (user) {
            if (user == null || _.isUndefined(user)) {
                logger.debug("user-lottery get||%j||获取抽奖卡失败, 玩家不在线, 用户ID:%j", data.uid, data.uid)
                cb({code: Code.FAIL});
                return;
            }

            cb({code: Code.OK, item: _.findWhere(user.player.items, {id: 5}), capital: globals.lottery.capital});
        });
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
                            fragment: -exchangeItem.fragment,
                            type: consts.GLOBAL.ADD_FRAGMENT_TYPE.EXCHANGE_FAILED_RETURN
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
    },

    isLatestActivityGodMonth: function (data, cb) {
        commonService.isLatestActivityGodMonth(data, cb);
    },

    getLatestActivityGodMonth: function (data, cb) {
        commonService.getLatestActivityGodMonth(data, cb);
    },

    //获取上月的股神月排行榜获奖记录
    getLatestActivityGrantRecordGodMonth: function (data, cb) {
        commonService.getLatestActivityGrantRecordGodMonth(data, cb);
    },

    //获得抽奖列表
    getLotteryItemList: function (data, cb) {
        cb({lotteryItemList: _.map(lotteryItemConf, function(item) {return {id: item.id, summary: item.summary, icon: item.icon}})});
    },

    //抽奖
    lottery: function (data, cb) {
        playerService.getUserCacheByUid(data.uid, function (user) {
            if (user == null || _.isUndefined(user)) {
                logger.debug("user-lottery||%j||抽奖失败, 玩家不在线, 用户ID:%j", data.uid, data.uid)
                cb({code: Code.FAIL});
                return;
            }

            //默认消耗金币
            var consumeType = 0;    //0：金币，1：抽奖卡
            //如果有抽奖卡则优先消耗抽奖卡
            var lotteryCard = _.findWhere(user.player.items, {id: 5});
            if (!_.isUndefined(lotteryCard) && lotteryCard.value > 0) {
                consumeType = 1;
            }
            else {
                if (user.player.gold < globals.lottery.capital) {
                    cb({code: Code.FAIL, err: consts.ERR_CODE.LOTTERY.TOO_POOR});
                    return;
                }
            }


            //获得奖励
            var gift = lottery.get();

            var msg = "恭喜您获得[";

            new Promise(function(resolve, reject) {
                if (consumeType === 0) {
                    user.player.addGold(consts.GLOBAL.ADD_GOLD_TYPE.ACTIVITY, -globals.lottery.capital, function() {
                        resolve();
                    });
                }
                else {
                    var items = [{ id: 5, value: -1 }];

                    user.player.addItems(consts.GLOBAL.ADD_ITEM_TYPE.CONSUME, items, function() {
                        resolve();
                    });
                }
                
            })
            .then(function() {

                if (gift.fragment > 0) {
                    user.player.addFragment(consts.GLOBAL.ADD_FRAGMENT_TYPE.ACTIVITY, gift.fragment, function() {
                        msg += gift.fragment + "个元宝"
                        Promise.resolve(msg);
                    })
                }
                else {
                    Promise.resolve(msg);
                }
            })
            .then(function() {
                if (gift.items.length > 0) {
                    user.player.addItems(consts.GLOBAL.ADD_ITEM_TYPE.ACTIVITY, gift.items, function() {
                        gift.items.forEach(function(item) {
                            if (item.id === 2) {
                                msg += item.value + "个喇叭"
                            }
                            else if (item.id === 3) {
                                msg += item.value + "天记牌器"
                            }
                            else if (item.id === 5) {
                                msg += item.value + "张抽奖卡"
                            }
                        })
                        Promise.resolve(msg);
                    })
                }
                else {
                    Promise.resolve(msg);
                }
            })
            .then(function() {
                if (gift.gold > 0) {
                    user.player.addGold(consts.GLOBAL.ADD_GOLD_TYPE.ACTIVITY, gift.gold, function() {
                        msg += gift.gold + "金币";
                        msg += "]";
                        cb({code: Code.OK, msg: msg, giftId: gift.id, consumeType: consumeType});
                    })
                }
                else {
                    msg += "]";
                    cb({code: Code.OK, msg: msg, giftId: gift.id, consumeType: consumeType});
                }
            });

        });
    },


    getAppleStoreApproveState: function (data, cb) {
        commonService.getAppleSetting(cb);
    },

    /**
     * 获取本月用户牌局记录, 返回战绩/胜率.
     * @param data
     * @param cb
     */
    getUserBattleRecordAnalysis: function (data, cb) {
        commonService.getUserBattleRecordAnalysis(data, cb);
    }
}

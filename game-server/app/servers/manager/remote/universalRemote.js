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
    getTopOfAppReleaseRecord: function (data) {
        commonService.getTopOfAppReleaseRecord(data);
    },
    
    getSystemMessage: function (data, cb) {
        commonService.getSystemMessage(data, cb);
    },


    sendBindingSMS: function (data, cb) {
        playerService.getUserCacheByUid(data.uid, function (user) {
            if (user == null || _.isUndefined(user)) {
                logger.error("user-send SMS||%j||发送短信失败, 玩家不在线, 用户ID:%j", data.uid, data.uid)
                cb({ code: Code.FAIL });
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
                cb({ code: Code.FAIL });
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
                logger4payment.error('支付后逻辑失败||%s||Apple Store Server验证时,HTTP失败.||%j', data.uid, {productId: data.productId, device: 'ios'})

                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: dispatcher(data.uid, connectors).id
                }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                cb();
                return;
            }
            if (bodyJson.status != open.APPLE_IAP.VERIFY_RECEIPT.OK_STATUS) {
                logger4payment.error('支付后逻辑失败||%s||Apple Store Server验证时,RECEIPT失败(可能非法).||%j', data.uid, {productId: data.productId, device: 'ios'})
                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: dispatcher(data.uid, connectors).id
                }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                cb();
                return;
            }

            logger4payment.info(response.body);

            var order = {
                uid: data.uid,
                productId: data.productId,
                state: consts.ORDER.STATE.FINISHED,
                device: 'ios',
                channel: 'IAP',
                charge: null
            }

            var transactionId = -1;
            if (response.body.receipt.in_app.length > 0) {
                transactionId = response.body.receipt.in_app[0].transaction_id;
            }

            if (transactionId == -1) {
                logger4payment.error('支付后逻辑失败||%s||Apple Store Receipt中没有transaction_id||%j', data.uid, {productId: data.productId, device: 'ios'})
                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: dispatcher(data.uid, connectors).id
                }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                cb();
                return;
            }


            //根据receipt的transaction_id 查询已有订单是否存在, 如果存在并且已完成, 则认为是非法receipt
            commonService.searchOrderByTransactionId(transactionId, function (err, doc) {
                if (err || (doc && doc.state == consts.ORDER.STATE.FINISHED)) {
                    logger4payment.error('支付后逻辑失败||%s||Apple Store Receipt中没有transaction_id已使用, 可能是非法请求或漏单||%j', data.uid, {productId: data.productId, device: 'ios'})
                    messageService.pushMessageToPlayer({
                        uid: data.uid,
                        sid: dispatcher(data.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                    cb();
                    return;
                }

                paymentService.payment(order, null, function (err, result) {
                    if (err) {
                        messageService.pushMessageToPlayer({
                            uid: data.uid,
                            sid: dispatcher(data.uid, connectors).id
                        }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                        cb();
                        return;
                    }
                    logger4payment.info('支付后逻辑成功||%s||一切都很OK.||%j', data.uid, {productId: data.productId, device: 'ios', channel: 'IAP'})

                    messageService.pushMessageToPlayer({
                        uid: data.uid,
                        sid: dispatcher(data.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.OK});

                    cb();
                });
            })


        });

    },
    
    payment4Pingpp: function (data, cb) {
        
        var connectors = pomelo.app.getServersByType('connector');

        commonService.searchOrderByNumber(data.order_no, function (err, originalOrder) {
            if (err) {
                logger4payment.error('支付后逻辑失败||%s||Pingpp Webhooks参数中order_no 未找到订单.||%j', data);
                return;
            }

            var order = {
                uid: originalOrder.uid,
                productId: originalOrder.productId,
                state: originalOrder.paid == true ? consts.ORDER.STATE.FINISHED : consts.ORDER.STATE.PAYMENT_FAILED,
                device: originalOrder.device,
                channel: originalOrder.channel
            };

            paymentService.payment(order, data,
                function (err, result) {
                    if (err) {
                        messageService.pushMessageToPlayer({
                            uid: data.uid,
                            sid: dispatcher(data.uid, connectors).id
                        }, consts.EVENT.PAYMENT_RESULT, {code: Code.FAIL});
                        cb();
                        return;
                    }
                    logger4payment.info('支付后逻辑成功||%s||一切都很OK.||%j', originalOrder.uid, {productId: originalOrder.productId, device: originalOrder.device, channel: originalOrder.channel})

                    messageService.pushMessageToPlayer({
                        uid: data.uid,
                        sid: dispatcher(data.uid, connectors).id
                    }, consts.EVENT.PAYMENT_RESULT, {code: Code.OK});

                    cb();
                });
        })


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
        console.log('-- mobileRechargeHandler --', data);
        
        //如果失败，先查询是否订单存在
        exchangeService.getExchangeRecordByNumber(data.orderid, function(err, exchangeRecord) {
            if (err) {
                logger.info('callback-apxi||%j||处理APIX回调时, 未根据订单号查到兑换记录', {number: data.orderid});
                cb();
                return;
            }
            
            if (exchangeRecord.state == consts.ORDER.STATE.CANCELED) {
                logger.info('callback-apxi||%j||处理APIX回调时, 该兑换记录已处理过', {number: data.orderid});
                cb();
                return;
            }
            
            //获取兑换产品信息
            exchangeService.getExchangeListById(exchangeRecord._id, function (err, exchangeItem) {
                //查询玩家是否在线
                playerService.getUserCacheByUid(exchangeRecord.uid, function (user) {
                    //如果玩家不在线，则直接操作DB更新
                    if (user == null || _.isUndefined(user)) {
                        exchangeService.callbackPlayerFragment({uid: exchangeRecord.uid, fragment: exchangeItem.fragment}, function (err, p) {
                            if (err) {
                                logger.error('callback-apxi||%s||处理APIX充值失败回调异常: %o', data.orderid, err);
                            } else {
                                logger.info('callback-apxi||%s||处理成功', data.orderid);
                            }
                        });
                    } 
                    //如果玩家在线，则通过pomelo-sync处理并向客户端发送元宝变化事件
                    else {
                        user.player.addFragment(consts.GLOBAL.ADD_FRAGMENT_TYPE.EXCHANGE_FAILED_RETURN, exchangeItem.fragment, function(fragment) {
                            //TODO 可以通过UI_COMMAND发送兑换模块有新状态
                        })
                    }
                });
                cb()
            });
            
        });
        
        
    }
}
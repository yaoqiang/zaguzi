var _ = require('lodash');

var Code = require('../../../../../shared/code');
var consts = require('../../../consts/consts');
var open = require('../../../consts/open');

var logger = require('log4js').getLogger(consts.LOG.USER);
var logger4payment = require('log4js').getLogger(consts.LOG.PAYMENT);

var utils = require('../../../util/utils');

var request = require('request');

var playerService = require('../../../services/playerService');
var openService = require('../../../services/openService');
var commonService = require('../../../services/commonService');
var exchangeService = require('../../../services/exchangeService');
var shopService = require('../../../services/shopService');
var paymentService = require('../../../services/paymentService');


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

            var bodyJson = JSON.parse(body);
            if (response.statusCode != Code.OK) {
                logger4payment.error('支付后逻辑失败||%s||Apple Store Server验证时,HTTP失败.||%j', data.uid, {productId: data.productId, device: 'ios'})
                cb({code: Code.FAIL});
                return;
            }
            if (bodyJson.status != open.APPLE_IAP.VERIFY_RECEIPT.OK_STATUS) {
                logger4payment.error('支付后逻辑失败||%s||Apple Store Server验证时,RECEIPT失败(可能非法).||%j', data.uid, {productId: data.productId, device: 'ios'})
                cb({code: Code.FAIL});
                return;
            }
            paymentService.payment(data.uid, data.productId, consts.ORDER.STATE.FINISHED, 'ios', 'ios', function (err, result) {
                if (err) {
                    cb({code: Code.FAIL});
                    return;
                }
                cb({code: Code.OK});
            });
        });



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
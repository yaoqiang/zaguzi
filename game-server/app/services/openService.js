var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var open = require('../consts/open');
var Code = require('../../../shared/code');

var logger = require('log4js').getLogger(consts.LOG.SYSTEM);
var userDao = require('../dao/userDao');
var commonDao = require('../dao/commonDao');

var Promise = require('promise');

var request = require('request');

var qs = require('qs');

var md5 = require('md5');

var utils = require('../util/utils');


var openService = module.exports

//////////////////////////////////////
// 第三方调用接口
//////////////////////////////////////

/**
 * 聚合API发送短信
 */
openService.sendSMS = function (data, cb) {
    //mobile=手机号码&tpl_id=短信模板ID&tpl_value=%23code%23%3D654654&key=
    if (_.isElement(data.mobile)) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.MOBILE_NOT_BLANK});
        return;
    }

    if (!utils.mobileValidate(data.mobile)) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.MOBILE_NOT_VALIDATE});
        return;
    }

    userDao.findByMobile(data.mobile, function (err, result) {
        if (result) {
            cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.MOBILE_ALREADY_BINDING});
            return;
        }

        //调用第三方平台发送短信验证码, 4位数字
        var captcha = Math.floor(Math.random() * (9999 - 1000) + 1000);

        commonDao.updateCaptchaCode({mobile: data.mobile, captcha: captcha}, function (updateResult) {
            if (!updateResult) {
                cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.ERR});
                return;
            }

            //request paramters
            data.tpl_id = data.tplId;
            data.tpl_value = '%23code%23%3D' + captcha;
            data.key = open.JUHE.SMS_API.APP_KEY;

            var options = {
                method: open.JUHE.SMS_API.METHOD,
                url: open.JUHE.SMS_API.URL,
                qs: data
            };

            request(options, function (err, response, body) {
                if (err) {
                    logger.error('open-sms||发送短信失败||');
                    cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.ERR});
                    return;
                }

                var bodyJson = JSON.parse(body);

                if (bodyJson.error_code != 0) {
                    logger.error('open-sms||发送短信失败||');
                    cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.ERR});
                    return;
                }

                cb({code: Code.OK});
            });

        });

    });

}

//data: {mobile: xx, denomination: xx, number: xx}
openService.mobileRecharge = function (data, cb) {

    var options = {
        method: open.APIX.MOBILE_RECHARGE.METHOD,
        url: open.APIX.MOBILE_RECHARGE.URL,
        qs: {
            phone: data.mobile,
            price: data.denomination,
            orderid: data.number,
            sign: md5(data.mobile + data.denomination + data.number),
            callback_url: ''
        },
        headers: {
            'apix-key': open.APIX.MOBILE_RECHARGE.KEY,
            'content-type': 'application/json',
            accept: 'application/json'
        }
    };

    request(options, function (error, response, body) {
        if (error) {
            logger.error('open-mobile recharge||调用充值接口失败||%j', {
                mobile: data.mobile,
                number: data.number,
                denomination: data.denomination,
                err: error
            });
            cb({code: Code.FAIL});
            return;
        }

        var bodyJson = JSON.parse(body);
        if (bodyJson.Code != 0) {
            logger.error('open-mobile recharge||调用充值接口失败||%j', {
                mobile: data.mobile,
                number: data.number,
                denomination: data.denomination,
                err: body.Msg
            });
            cb({code: Code.FAIL, err: consts.ERR_CODE.EXCHANGE.ERR})
            return;
        }

        cb({code: Code.OK})

    });

}
var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var open = require('../consts/open');
var logger = require('pomelo-logger').getLogger(consts.LOG.SYSTEM);
var Code = require('../../../shared/code');
var utils = require('../util/utils');
var userDao = require('../dao/userDao');
var commonDao = require('../dao/commonDao');

var Promise = require('promise');

var request = require('request');

var qs = require('qs');

var exp = module.exports

/**
 * 聚合API发送短信
 */
exp.sendSMS = function (data, cb) {
    //mobile=手机号码&tpl_id=短信模板ID&tpl_value=%23code%23%3D654654&key=
    if (!!data.mobile) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.MOBILE_NOT_BLANK});
        return;
    }
    
    if (!utils.mobileValidate(data.mobile)) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.MOBILE_NOT_VALIDATE});
        return;
    }
    
    userDao.findByMobile(data.mobile, function(err, result) {
       if (result) {
           cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.MOBILE_ALREADY_BINDING});
           return;
       }
       
       //调用第三方平台发送短信验证码, 4位数字
       var captcha = Math.floor(Math.random()*(9999-1000)+1000);
       
       commonDao.updateCaptchaCode({mobile: data.mobile, captcha: captcha}, function (updateResult) {
           if (!updateResult) {
               cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.ERR});
                return;
           }
           
           //request paramters
           data.tpl_id = open.JUHE.SMS_API.TEMPLATE_ID.MOBILE_BINDING;
            data.tpl_value = '%23code%23%3D' + captcha;
            data.key = open.JUHE.SMS_API.APP_KEY;
            
            var options = { 
                method: open.JUHE.SMS_API.METHOD,
                url: open.JUHE.SMS_API.URL,
                qs: data
            };
            
            request(options, function (err, response, body) {
                if (err) {
                    console.log('------- send SMS ----------', err);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.ERR});
                    return;
                }
                
                console.log(response);
                
                if (response.error_code != 0) {
                    console.log('------- send SMS ----------', err);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.ERR});
                    return;
                }
                
                cb({code: Code.OK});
            });
           
       });
       
    });
    
}

exp.mobileRecharge = function(data, cb) {
    if (!!data.mobile) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.MOBILE_RECHARGE.MOBILE_NOT_BLANK});
        return;
    }
    
    if (!utils.mobileValidate(data.mobile)) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.MOBILE_RECHARGE.MOBILE_NOT_VALIDATE});
        return;
    }
    
    if (!data.denomination || !_.isNumber(data.denomination)) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.MOBILE_RECHARGE.DEMONINATION_NOT_ERR});
        return;
    }
    
    
}
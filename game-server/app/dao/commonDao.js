var _ = require('lodash');

var pomelo = require('pomelo');

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

var commonDao = module.exports;



//单独为Player处理元宝
commonDao.addFragment = function(data, cb) {
    
}

//////////////////
//充值后，生成订单
/////////////////
commonDao.saveOrder = function(data, cb) {
    //data: {uid: xx, orderSerialNumber: xx, productId: xx, amount: xx, state: xx, device: xx, channel: xx, 
    //player: {nickName: xx, avatar: xx}}   //player info for rankingList
    db.order.save(data, function(err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        }
        else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}


//ranking list
commonDao.getRankingList = function (data, cb) {
    db.rankingList.find({type: data.type}).sort({_id: -1}).limit(1, function(err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        }
        else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}


//版本检查
commonDao.getTopOfAppReleaseRecord = function (data, cb) {
    db.appReleaseRecord.find({}).sort({_id: -1}).limit(1, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        }
        else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}



commonDao.updateCaptchaCode = function (data, cb) {
    //
    db.captcha.findAndModify({
        query: {
            mobile: data.mobile
        }, update: {
            $set: {
                captcha: data.captcha,
                createdAt: new Date()
            }
        }, new: true, upsert: true,
    }, function (err, doc, lastErrorObject) {
        if (err) logger.error('--commonDao.updateCaptchaCode error--')
        cb({
            code: err ? Code.FAIL : Code.OK
        })
    })
}


commonDao.bindingMobile = function (data, cb) {
    db.captcha.findOne({
        mobile: data.mobile
    }, function (err, doc) {
        if (doc.captcha != data.captcha) {
            cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.CAPTCHA_ERR});
            return;
        }

        //var password = passwordHash.generate(data.password);
        var password = data.password;

        db.user.findAndModify({
            query: {
                _id: mongojs.ObjectId(data.uid)
            }, update: {
                $set: {mobile: data.mobile, password: password}
            }, new: true,
        }, function (err, doc) {
            if (err) {
                cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.ERR});
            }
            else {
                cb({code: Code.OK});
            }
        })
    })
}
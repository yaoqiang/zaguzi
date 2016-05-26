var _ = require('lodash');

var pomelo = require('pomelo-rt');

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

var Token = require('../../../shared/token');
var secret = require('../../../shared/config/session').secret;

var commonDao = module.exports;


//apple设置(审核)
commonDao.getAppleSetting = function (cb) {
    db.appleSetting.findOne({}, function (err, doc) {
        if (doc) return cb(doc);
        //cb default
        cb({inReview: true});
    })
}

commonDao.setAppleSetting = function (data, cb) {
    db.appleSetting.upsert({inReview: data.inReview}, function (err, doc) {
        
    });

    db.appleSetting.findAndModify({
        query: {},
        update: { $set: { inReview: data.inReview } },
        new: true,
        upsert: true
    }, function (err, doc, lastErrorObject) {
        // doc.tag === 'maintainer'
        if (err) {
            return cb({code: Code.FAIL});
        }
        cb({code: Code.OK});
    })
}


//单独为Player处理元宝
commonDao.addFragment = function(data, cb) {

}

//////////////////////////////////////////////////////////////
//充值后，生成订单；
// 1、如果是Apple IAP则在充值后生成；
// 2、如果是走Pingxx则在发起支付时生成，支付完成后更新订单状态
//////////////////////////////////////////////////////////////
commonDao.saveOrUpdateOrder = function(data, charge, cb) {
    //data: { order: {uid: xx, orderSerialNumber: xx, productId: xx, amount: xx, state: xx, device: xx, channel: xx}, charge:{}
    //player: {nickName: xx, avatar: xx}}   //player info for rankingList
    if (_.isUndefined(charge) || _.isNull(charge)) {
        db.order.save(data, function(err, doc) {
            if (err) {
                utils.invokeCallback(cb, err, null);
            }
            else {
                utils.invokeCallback(cb, null, doc);
            }
        });
    }
    else {
        db.order.findAndModify({
            query: {orderSerialNumber: data.orderSerialNumber},
            update: {
                $set: {
                    state: data.state,
                    charge: charge
                }
            }}, function (err, doc) {
                if (err) {
                    utils.invokeCallback(cb, err, null);
                }
                else {
                    utils.invokeCallback(cb, null, doc);
                }
            }
        );
    }

}

commonDao.searchOrderByNumber = function (orderSerialNumber, cb) {
    db.order.findOne({orderSerialNumber: orderSerialNumber}, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        }
        else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}

commonDao.searchLastOrderByUid = function (uid, cb) {
    db.order.find({uid: uid}).sort({_id: -1}).limit(1, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        }
        else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}

//for Apple IAP
commonDao.searchOrderByTransactionId = function (transactionId, cb) {
    db.order.findOne({transactionId: transactionId}, function (err, doc) {
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

//获取系统消息
commonDao.getSystemMessage = function (data, cb) {
    db.systemMessage.find({}).sort({_id: -1}).limit(10, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        }
        else {
            utils.invokeCallback(cb, null, doc);
        }
    })
}


//更新验证码
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
        if (err) logger.error('--commonDao.updateCaptchaCode error-- %o', err)
        cb({
            code: err ? Code.FAIL : Code.OK
        })
    })
}


commonDao.bindingMobile = function (data, cb) {
    db.captcha.findOne({
        mobile: data.mobile
    }, function (err, doc) {
        if (err || doc == null) {
            cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.CAPTCHA_ERR});
            return;
        }
        if (doc.captcha != data.captcha) {
            cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.CAPTCHA_ERR});
            return;
        }

        var password = passwordHash.generate(data.password);

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
                //生成Token，用于绑定后更新客户端Token.
                var token = Token.create(data.uid, Date.now(), data.password.toString(), secret);
                cb({code: Code.OK, token: token});
            }
        })
    })
}


commonDao.resetPassword = function (data, cb) {
    db.captcha.findOne({
        mobile: data.mobile
    }, function (err, doc) {
        if (err || doc == null) {
            cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.CAPTCHA_ERR});
            return;
        }
        if (doc.captcha != data.captcha) {
            cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.CAPTCHA_ERR});
            return;
        }

        var password = passwordHash.generate(data.password);

        db.user.findAndModify({
            query: {
                mobile: data.mobile
            }, update: {
                $set: {password: password}
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


commonDao.saveInviteRecord = function (data) {
    db.inviteRecord.save(data, function (err, doc) {
        if (err) {
            cb(err, null);
            return;
        }
        cb(null, doc);
    })
}

commonDao.getInviteRecordListByUid = function (data, cb) {
    db.inviteRecord.find({uid: data.uid}).sort({_id: -1}).limit(20, function (err, docs) {
        cb({code: Code.OK, inviteRecordList: docs});
    })
}


//生成序列号消息
commonDao.generateSerialCodeByType = function (data, cb) {
    var initNumber = 100000001;
    db.serialCode.findOne({type: data.type}, function (err, doc) {
        if (err) {
            cb(err, null);
        }
        else {
            if (doc) {
                db.serialCode.findAndModify({
                	query: {_id: mongojs.ObjectId(doc._id)},
                	update: {$inc: {number: 1}},
                	new: true
                },
            	function (err, doc, lastErrorObject) {
                	cb(null, {number: doc.type.concat(doc.number.toString())});
            	});
            }
            else {
                db.serialCode.save({type: data.type, number: initNumber}, function (err, doc) {
                    cb(null, {number: doc.type.concat(doc.number.toString())});
                });
            }

        }
    })
}
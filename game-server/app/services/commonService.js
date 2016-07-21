var _ = require('lodash');
var pomelo = require('pomelo-rt');

var globals = require('../../config/data/globals');
var consts = require('../consts/consts');
var Code = require('../../../shared/code');
var messageService = require('./messageService');
var playerService = require('./playerService');
var commonDao = require('../dao/commonDao');
var userDao = require('../dao/userDao');

var compareVersions = require('compare-versions');

var commonService = module.exports

commonService.getRankingList = function (data, cb) {

    commonDao.getRankingList(data, function (err, doc) {

        if (err) {
            cb({ code: Code.OK, rankingList: [] });
            return;
        }
        if (doc && _.size(doc) > 0) {
            var rankingList = doc[0].ranking;

            if (data.type == consts.RANKING_LIST.RICH) {
                rankingList = _.sortBy(rankingList, 'gold').reverse();
            } else if (data.type == consts.RANKING_LIST.GOD) {
                rankingList = _.sortBy(rankingList, 'winning').reverse();
            } else if (data.type == consts.RANKING_LIST.RECHARGE) {
                rankingList = _.sortBy(rankingList, 'totalAmount').reverse();
            } else if (data.type == consts.RANKING_LIST.GOD_MONTH) {
                rankingList = _.sortBy(rankingList, 'winning').reverse();
            }

            cb({ code: Code.OK, rankingList: rankingList });
        }
        else {
            cb({ code: Code.OK, rankingList: [] });
        }
    });

}


commonService.getTopOfAppReleaseRecord = function (data, cb) {
    commonDao.getTopOfAppReleaseRecord(data, function (err, doc) {
        if (doc && doc.length > 0) {
            //version: 1.0.0, 1.0.1, 1.0.2 ...
            //a < b = -1, a == b: 0, a > b = 1;
            var result = compareVersions(data.version, doc[0].version);
            //如果客户端版本不是最新，则发送更新Event
            if (result == -1) {
                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: data.sid
                }, consts.EVENT.VERSION_UPGRADE, doc[0]);
            }
            else {
                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: data.sid
                }, consts.EVENT.VERSION_UPGRADE, { isNew: true });
            }
        }
        else {
            messageService.pushMessageToPlayer({
                uid: data.uid,
                sid: data.sid
            }, consts.EVENT.VERSION_UPGRADE, { isNew: true });
        }
    });
    cb();
}

commonService.getLastApp = function (data, cb) {
    commonDao.getTopOfAppReleaseRecord(data, function (err, doc) {
        if (doc && doc.length > 0) {
            //version: 1.0.0, 1.0.1, 1.0.2 ...
            //a < b = -1, a == b: 0, a > b = 1;
            var result = compareVersions(data.version, doc[0].version);
            //如果客户端版本不是最新，则发送更新Event
            if (result == -1) {
                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: data.sid
                }, consts.EVENT.VERSION_UPGRADE, doc[0]);
            }
        }
        
    });
    cb();
}

commonService.getSystemMessage = function (data, cb) {
    commonDao.getSystemMessage(data, function (err, doc) {
        if (doc) {
            cb({ code: Code.OK, systemMessageList: doc });
        }
        else {
            cb({ code: Code.FAIL });
        }

    })
}

commonService.getLastSystemMessageDate = function (data, cb) {
    commonDao.getLastSystemMessageDate(data, function (err, date) {
        if (date) {
            cb({ code: Code.OK, lastSystemMessageDate: date });
        }
        else {
            cb({ code: Code.FAIL });
        }

    })
}



commonService.bindingMobile = function (data, cb) {
    if (!data.captcha || !data.mobile || !data.password || !data.uid) {
        cb({ code: Code.FAIL });
        return;
    }

    //这段懒得搞Promise了, 不优雅了...
    userDao.findByMobile(data.mobile, function (err, result) {
        if (result) {
            cb({ code: Code.FAIL, err: consts.ERR_CODE.SMS.MOBILE_ALREADY_BINDING });
            return;
        }

        //如果输入了邀请码，验证邀请码，并处理邀请奖励
        if (!_.isUndefined(data.inviteMobile) && !_.isNull(data.inviteMobile) && data.inviteMobile != '') {
            userDao.findOneByMobile(data.inviteMobile, function (err, doc) {
                if (!doc) {
                    cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.INVITE_MOBILE_NOT_FOUNT});
                    return;
                }
                if (doc._id == data.uid) {
                    cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.INVITE_MOBILE_CAN_NOT_BE_SELF});
                    return;
                }
                commonDao.bindingMobile(data, function (bindingResult) {
                    //如果绑定成功, 处理邀请码相关奖励
                    if (bindingResult.code === Code.OK) {
                        if (!_.isUndefined(data.inviteMobile) && !_.isNull(data.inviteMobile) && data.inviteMobile != '') {
                            userDao.findOneByMobile(data.inviteMobile, function (err, doc) {
                                if (doc) {
                                    playerService.getInviteGrant(data.mobile, doc._id.toString(), function (getInviteGrantResult) {
                                    })
                                }
                            })
                        }
                    }
                    cb(bindingResult);
                });
            })
        }
        else {
            commonDao.bindingMobile(data, cb);
        }
        
    });
}


commonService.resetPassword = function (data, cb) {
    if (!data.captcha || !data.mobile || !data.password) {
        cb({ code: Code.FAIL });
        return;
    }

    userDao.findByMobile(data.mobile, function (err, result) {
        if (!result) {
            cb({ code: Code.FAIL, err: consts.ERR_CODE.SMS.MOBILE_NOT_VALIDATE });
            return;
        }

        commonDao.resetPassword(data, cb);
    });

}


commonService.getInviteRecordListByUid = function (data, cb) {
    commonDao.getInviteRecordListByUid(data, cb);
}


//-----------------------
// 订单相关
//-----------------------
commonService.setOrderStateByNumber = function (orderSerialNumber, state, charge, cb) {
    if (orderSerialNumber == '' || orderSerialNumber == undefined || orderSerialNumber == null) {
        //utils.invokeCallback
        cb({ code: Code.FAIL }, null);
        return;
    }

    var orderData = {
        orderSerialNumber: orderSerialNumber,
        state: state,
        charge: charge
    }

    commonDao.saveOrUpdateOrder(orderData, charge, cb);
}

commonService.searchOrderByNumber = function (orderSerialNumber, cb) {
    if (orderSerialNumber == '' || orderSerialNumber == undefined || orderSerialNumber == null) {
        cb({ code: Code.FAIL }, null);
        return;
    }

    commonDao.searchOrderByNumber(orderSerialNumber, cb);
}

commonService.searchLastOrderByUid = function (uid, cb) {
    if (uid == '' || uid == undefined || uid == null) {
        cb({ code: Code.FAIL }, null);
        return;
    }

    commonDao.searchLastOrderByUid(uid, function (err, doc) {
        if (doc && _.size(doc) > 0) {
            cb(null, doc[0]);
        }
        else {
            cb({ code: Code.FAIL }, null);
        }
    });
}


commonService.searchOrderByTransactionId = function (transactionId, cb) {
    if (transactionId == '' || transactionId == undefined || transactionId == null) {
        cb({ code: Code.FAIL }, null);
        return;
    }

    commonDao.searchOrderByTransactionId(transactionId, cb);
}


commonService.isLatestActivityGodMonth = function (data, cb) {
    commonDao.isLatestActivityGodMonth(data, cb);
}

commonService.getLatestActivityGodMonth = function (data, cb) {
    commonDao.getLatestActivityGodMonth(data, function(doc) {
        if (!doc) return cb({activity: null});
        return cb({content: doc.content, detail: doc.detail, name: doc.name, updatedAt: doc.updatedAt,
            threshold: doc.threshold.battle, enabled: doc.enabled, urlForRecord: doc.urlForRecord}) 
    });
}

commonService.getLatestActivityGrantRecordGodMonth = function (data, cb) {
    commonDao.getLatestActivityGrantRecordGodMonth(data, function(recordList) {
        try {
            var result = _.map(recordList, function(record) {
                record.detail.winning = parseFloat(record.detail.winning * 100).toFixed(2);
                if (record.mobile != '') {
                    try {
                        var mobilePrefix = record.mobile.substring(0, 3);
                        var mobileSuffix = record.mobile.substring(6, 11);
                        var mobile = mobilePrefix + "****" + mobileSuffix;
                        record.mobile = mobile;
                    } catch (e) {
                        record.mobile = "*"
                    }
                }
                return record;
            });

            cb({recordList: result});
        } catch (e) {
            console.log('err -> ', e);
        }
        
        cb({recordList: []});
    });
}

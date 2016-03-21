var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var Code = require('../../../shared/code');
var messageService = require('./messageService');
var commonDao = require('../dao/commonDao');
var userDao = require('../dao/userDao');

var compareVersions = require('compare-versions');

var commonService = module.exports

commonService.getRankingList = function (data, cb) {

    commonDao.getRankingList(data, function (err, doc) {

        if (doc && _.size(doc) > 0) {
            var rankingList = doc[0].ranking;

            if (data.type == consts.RANKING_LIST.RICH) {
                rankingList = _.sortBy(rankingList, 'gold').reverse();
            } else if (data.type == consts.RANKING_LIST.GOD) {
                rankingList = _.sortBy(rankingList, 'winning').reverse();
            } else if (data.type == consts.RANKING_LIST.RECHARGE) {
                rankingList = _.sortBy(rankingList, 'totalAmount').reverse();
            }

            cb({code: Code.OK, rankingList: rankingList});
        }
        else {
            cb({code: Code.OK, rankingList: []});
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
                }, consts.EVENT.VERSION_UPGRADE, {isNew: true});
            }
        }
        else {
            messageService.pushMessageToPlayer({
                uid: data.uid,
                sid: data.sid
            }, consts.EVENT.VERSION_UPGRADE, {isNew: true});
        }
    });
    cb();
}

commonService.getSystemMessage = function (data, cb) {
    commonDao.getSystemMessage(data, function (err, doc) {
        if (doc) {
            cb({code: Code.OK, systemMessageList: doc});
        }
        else {
            cb({code: Code.FAIL});
        }

    })
}


commonService.bindingMobile = function (data, cb) {
    if (!data.captcha || !data.mobile || !data.password || !data.uid) {
        cb({code: Code.FAIL});
        return;
    }

    userDao.findByMobile(data.mobile, function (err, result) {
        if (result) {
            cb({code: Code.FAIL, err: consts.ERR_CODE.SMS.MOBILE_ALREADY_BINDING});
            return;
        }

        commonDao.bindingMobile(data, cb);
    });


}


commonService.searchOrderByNumber = function (orderSerialNumber, cb) {
    if (orderSerialNumber == '' || orderSerialNumber == undefined || orderSerialNumber == null) {
        cb({code: Code.FAIL}, null);
        return;
    }

    commonDao.searchOrderByNumber(orderSerialNumber, cb);
}


commonService.searchOrderByTransactionId = function (transactionId, cb) {
    if (transactionId == '' || transactionId == undefined || transactionId == null) {
        cb({code: Code.FAIL}, null);
        return;
    }

    commonDao.searchOrderByTransactionId(transactionId, cb);
}

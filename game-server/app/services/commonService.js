var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var Code = require('../../../shared/code');
var messageService = require('./messageService');
var commonDao = require('../dao/commonDao');

var compareVersions = require('compare-versions');

var exp = module.exports

exp.getRankingList = function (data, cb) {

    commonDao.getRankingList(data, function (err, doc) {

        var rankingList = doc[0].ranking;

        if (data.type == consts.RANKING_LIST.RICH) {
            rankingList = _.sortBy(rankingList, 'gold').reverse();
        } else if (data.type == consts.RANKING_LIST.GOD) {
            rankingList = _.sortBy(rankingList, 'winning').reverse();
        } else if (data.type == consts.RANKING_LIST.RECHARGE) {
            rankingList = _.sortBy(rankingList, 'totalAmount').reverse();
        }

        if (doc && _.size(doc) > 0) {
            cb({code: Code.OK, rankingList: rankingList});
        }
        else {
            cb({code: Code.OK, rankingList: []});
        }
    });

}


exp.getTopOfAppReleaseRecord = function (data) {
    commonDao.getTopOfAppReleaseRecord(data, function (err, doc) {
        if (doc) {
            //version: 1.0.0, 1.0.1, 1.0.2 ...
            //a < b = -1, a == b: 0, a > b = 1;
            var result = compareVersions(data.version, doc.version);
            //如果客户端版本不是最新，则发送更新Event
            if (result == -1) {
                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: data.serverId
                }, consts.EVENT.VERSION_UPGRADE, data.summary);
            }
        }

    })
}


exp.bindingMobile = function (data, cb) {
    if (!data.captcha || !data.mobile || !data.password || !data.uid) {
        cb({code: Code.FAIL});
        return;
    }

    commonDao.bindingMobile(data, cb);

}
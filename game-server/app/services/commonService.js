var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var Code = require('../../../shared/code');
var messageService = require('./messageService');
var commonDao = require('../dao/commonDao');
var exp = module.exports

exp.getRankingList = function (data, cb) {

    commonDao.getRankingList(data, function (err, doc) {

        if (doc && _.size(doc) > 0) {
            cb({code: Code.OK, rankingList: doc[0].ranking});
        }
        else {
            cb({code: Code.OK, rankingList: []});
        }
    });

}


exp.getTopOfAppReleaseRecord = function (data) {
    commonDao.getTopOfAppReleaseRecord(data, function (err, doc) {
        if (doc) {
            //version: 1.0, 1.1, 1.2 ...
            if (doc.version > data.version) {
                //send app upgrade event
                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: data.serverId
                }, consts.EVENT.VERSION_UPGRADE, {releaseInfo: doc});
            }
        }

    })
}
var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var Code = require('../../../shared/code');
var messageService = require('./messageService');
var commonDao = require('../dao/commonDao');
var exp = module.exports

exp.getRankingList = function (data, cb) {

    commonDao.getRankingList(data, function (doc) {
        if (doc) {
            cb({code: Code.OK, rankingList: {type: data.type, details: doc.details}});
        }
        else {
            cb({code: Code.OK, rankingList: {type: data.type, details: []}});
        }
    });

}


exp.getTopOfAppReleaseRecord = function (data) {
    commonDao.getTopOfAppReleaseRecord(data, function (doc) {
        if (doc) {
            //version: 1.0, 1.1, 1.2 ...
            if (doc.version > data.version) {
                //send app upgrade event
                messageService.pushMessageToPlayer({
                    uid: data.uid,
                    sid: data.serverId
                }, consts.EVENT.VERSION_UPGRADE, {appInfo: doc});
            }
        }

    })
}
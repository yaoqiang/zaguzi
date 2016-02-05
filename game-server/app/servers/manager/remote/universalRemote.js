var commonService = require('../../../services/commonService');
var Code = require('../../../../../shared/code');
var consts = require('../../../consts/consts');
var open = require('../../../consts/open');
var utils = require('../../../util/utils');
var _ = require('lodash');

var playerService = require('../../../services/playerService');
var openService = require('../../../services/openService');

var logger = require('pomelo-logger').getLogger(consts.LOG.USER);

module.exports = function(app) {
    return new UniversalRemote(app);
};

var UniversalRemote = function(app) {
    this.app = app;
};

UniversalRemote.prototype = {

    getRankingList: function (data, cb) {
        commonService.getRankingList(data, cb);
    },

    //notify
    getTopOfAppReleaseRecord: function (data, cb) {
        commonService.getTopOfAppReleaseRecord(data);
        cb();
    },


    sendBindingSMS: function (data, cb) {
        playerService.getUserCacheByUid(data.uid, function(user) {
            if (user == null || _.isUndefined(user)) {
                logger.error("user-send SMS||%j||发送短信失败, 玩家不在线, 用户ID:%j", data.uid, data.uid)
                cb({code: Code.FAIL});
                return;
            }
            data.tplId = open.JUHE.SMS_API.TEMPLATE_ID.MOBILE_BINDING;
            openService.sendSMS(data, cb);
        });
    },
    
    bindingMobile: function (data, cb) {
        playerService.getUserCacheByUid(data.uid, function(user) {
            if (user == null || _.isUndefined(user)) {
                logger.error("user-binding mobile||%j||绑定失败, 玩家不在线, 用户ID:%j", data.uid, data.uid)
                cb({code: Code.FAIL});
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
    
    //
    mobileRechargeHandler: function (data, cb) {
        console.log('-- mobileRechargeHandler --', arguments);
        cb()
    }
}
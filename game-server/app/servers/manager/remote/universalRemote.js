var commonService = require('../../../services/commonService');
var exchangeService = require('../../../services/exchangeService');
var Code = require('../../../../../shared/code');
var utils = require('../../../util/utils');
var _ = require('lodash');

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
    getTopOfAppReleaseRecord: function (data) {
        commonService.getTopOfAppReleaseRecord(data);
    }
}
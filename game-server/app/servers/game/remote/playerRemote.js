var playerService = require('../../../services/playerService');

module.exports = function(app) {
    return new PlayerRemote(app);
};

var PlayerRemote = function(app) {
    this.app = app;
};

PlayerRemote.prototype.getUserInfo = function (data, cb) {
    playerService.getUserInfo(data.uid, cb);
};
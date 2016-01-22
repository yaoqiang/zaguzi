var playerService = require('../services/playerService');

module.exports = function(app, opts) {
  return new OnlineUserAnalysis(app, opts);
};

var DEFAULT_INTERVAL = 60 * 1000 * 60; // print cycle

var OnlineUserAnalysis = function(app, opts) {
  this.app = app;
  this.interval = opts.interval | DEFAULT_INTERVAL;
  this.timerId = null;
};

OnlineUserAnalysis.name = '__OnlineUserAnalysis__';

OnlineUserAnalysis.prototype.start = function(cb) {
  var self = this;
  this.timerId = setInterval(function() {
    //获取在线人数情况并将结果缓存在manager server;
    var result = playerService.getOnlineUserList();
    
    this.app.onlineUserResultCache = result;
    
  }, this.interval);
  process.nextTick (cb);
}

OnlineUserAnalysis.prototype.afterStart = function(cb) {
  process.nextTick (cb);
}

OnlineUserAnalysis.prototype.stop = function(force, cb) {
  clearInterval (this.timerId);
  process.nextTick (cb);
}

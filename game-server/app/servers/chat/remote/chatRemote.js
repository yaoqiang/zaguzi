var channelUtil = require('../../../util/channelUtil');

module.exports = function(app) {
	return new ChatRemote(app, app.get('chatService'));
};

var ChatRemote = function(app, chatService) {
	this.app = app;
	this.chatService = chatService;
};

/**
 *	Add player into channel
 */
ChatRemote.prototype.add = function(uid, playerName, channelName, cb) {
	var code = this.chatService.add(uid, playerName, channelName);
	cb(null, code);
};

/**
 * leave Channel
 * uid
 * channelName
 */
ChatRemote.prototype.leave =function(uid, channelName, cb){
	this.chatService(uid, channelName);
	cb();
};

/**
 * kick out user
 *
 */
ChatRemote.prototype.kick = function(uid, channelName, cb){
	this.chatService.kick(uid, channelName);
	cb();
};

/**
 * 发送BBS: 公告类互动消息类
 */
ChatRemote.prototype.sendBBS = function(content, cb){
	this.chatService.pushByChannelForBBS(channelUtil.getGlobalChannelName(), content, cb);
};

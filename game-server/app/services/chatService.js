var Code = require('../../../shared/code');
var utils = require('../util/utils');
var dispatcher = require('../util/dispatcher');
var Event = require('../consts/consts').EVENT;
var _ = require('lodash');

var ChatService = function(app) {
  this.app = app;
  this.uidMap = [];
};

module.exports = ChatService;

/**
 * Add player into the channel
 *
 * @param {String} uid         user id
 * @param {String} playerName  player's role name
 * @param {String} channelName channel name
 * @return {Number} see code.js
 */
ChatService.prototype.add = function(uid, playerName, channelName) {
  var sid = getSidByUid(uid, this.app);
  if(!sid) {
    return Code.CHAT.FA_UNKNOWN_CONNECTOR;
  }

  if(checkDuplicate(this, uid)) {
    return Code.OK;
  }

  var channel = this.app.get('channelService').getChannel(channelName, true);
  if(!channel) {
    return Code.CHAT.FA_CHANNEL_CREATE;
  }
  channel.add(uid, sid);
  addRecord(this, uid, playerName, sid);

  return Code.OK;
};



/**
 * Kick user from chat service.
 * This operation would remove the user from all channels and
 * clear all the records of the user.
 *
 * @param  {String} uid user id
 */
ChatService.prototype.kick = function(uid, channelName) {
  var record = _.findWhere(this.uidMap, {uid: uid});
  if(record) {
    // remove user from channels
    var channel;
    channel = this.app.get('channelService').getChannel(channelName);

    if(channel) {
      channel.leave(uid, record.sid);
      this.uidMap = _.without(this.uidMap, record);
    }
  }

};

/**
 * Push message by the specified channel  小喇叭
 *
 * @param  {String}   channelName channel name
 * @param  {Object}   msg         message json object
 * @param  {Function} cb          callback function
 */
ChatService.prototype.pushByChannel = function(channelName, msg, cb) {
  var channel = this.app.get('channelService').getChannel(channelName);
  if(!channel) {
    cb(new Error('channel ' + channelName + ' dose not exist'));
    return;
  }

  channel.pushMessage(Event.BROADCAST, msg, cb);
};

/**
 * Push message by the specified channel for BBS 系统公告、互动类型
 *
 * @param  {String}   channelName channel name
 * @param  {Object}   msg         message json object
 * @param  {Function} cb          callback function
 */
ChatService.prototype.pushByChannelForBBS = function(channelName, msg, cb) {
  var channel = this.app.get('channelService').getChannel(channelName);
  if(!channel) {
    cb(new Error('channel ' + channelName + ' dose not exist'));
    return;
  }

  channel.pushMessage(Event.BBS, msg, cb);
};


ChatService.prototype.pushByUid = function(uid, msg, cb) {
  var record = this.uidMap[uid];
  if(!record) {
    cb(null, Code.CHAT.FA_USER_NOT_ONLINE);
    return;
  }

  this.app.get('channelService').pushMessageByUids(Event.CHAT_PRIVATE, msg, [{uid: record.uid, sid: record.sid}], cb);
};

/**
 * check whether the user has already in the channel
 */
var checkDuplicate = function(service, uid) {
  return !_.isUndefined(_.findWhere(service.uidMap, {uid: uid}));
};

/**
 * Add records for the specified user
 */
var addRecord = function(service, uid, name, sid) {
  var record = {uid: uid, name: name, sid: sid};
  service.uidMap.push(record);
};

/**
 * Remove records for the specified user and channel pair
 */
var removeRecord = function(service, uid) {
};


/**
 * Get the connector server id assosiated with the uid
 */
var getSidByUid = function(uid, app) {
  var connector = dispatcher.dispatch(uid, app.getServersByType('connector'));
  if(connector) {
    return connector.id;
  }
  return null;
};
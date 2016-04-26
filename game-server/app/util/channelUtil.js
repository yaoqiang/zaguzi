var ChannelUtil = module.exports;

var GLOBAL_CHANNEL_NAME = 'zgz_world';
var ROOM_CHANNEL_PREFIX = 'game_';

ChannelUtil.getGlobalChannelName = function() {
    return GLOBAL_CHANNEL_NAME;
};

ChannelUtil.getGameChannelName = function(gameId) {
    return ROOM_CHANNEL_PREFIX + gameId;
};
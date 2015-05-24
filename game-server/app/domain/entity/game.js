var pomelo = require('pomelo');
var _ = require('underscore');
var channelUtil = require('../../util/channelUtil');
var consts = require('../../consts/consts');
var Actor = require('./actor');
var utils = require('../../util/utils');



var Game = function(roomId, gameId)
{
    this.roomId = roomId;
    this.gameId = gameId;
    this.maxActor = roomId > 10 ? (roomId > 20 ? 7 : 6) : 5;
    this.currentActorNum = 0;
    this.type = roomId > 10 ? (roomId > 20 ? consts.GAME.TYPE.SEVEN : consts.GAME.TYPE.SIX) : consts.GAME.TYPE.FIVE;
    this.actors = new Array(this.maxActor);
    this.isFull = false;
    this.isAllReady = false;
    this.seatList = [];   //{seatNr:xx, uid:xx}
    this.channel = null;
    this.channelService = pomelo.app.get('channelService');

    this.init();
}

Game.prototype.init = function()
{
    for(var i = 1; i <= this.maxActor; i++)
    {
        this.seatList.push({seatNr: i, uid: undefined});
    }
    this.createChannel();

}

Game.prototype.createChannel = function()
{
    if(this.channel) {
        return this.channel;
    }
    var channelName = channelUtil.getGameChannelName(this.gameId);
    this.channel = this.channelService.getChannel(channelName, true);
    if(this.channel) {
        return this.channel;
    }
    return null;
}



Game.prototype.join = function(data)
{
    if (!data || typeof data !== 'object') {
        return consts.ROOM.JOIN_RET_CODE.ERR;
    }

    for (var i in data) {
        if(!data[i] || data[i] <= 0) {
            return consts.ROOM.JOIN_RET_CODE.ERR;
        }
    }

    if (!doAddActor(this, data))
    {
        return consts.ROOM.JOIN_RET_CODE.ERR;
    }

    if (!this.addActor2Channel(data))
    {
        return consts.ROOM.JOIN_RET_CODE.ERR;
    }

    var u = _.findWhere(pomelo.app.userCache, {uid: data.uid});

    var actor = _.findWhere(this.actors, {uid: data.uid});

    actor.setProperties(u.player);

    this.channel.pushMessage('onJoin', {actor: actor}, data.serverId, null);
    return consts.ROOM.JOIN_RET_CODE.OK;
}




/**
 * 添加actor到game
 * @param gameObj
 * @param data
 * @returns {boolean}
 */
function doAddActor(gameObj, data)
{
    //如果牌局已满
    if (gameObj.maxActor == gameObj.currentActorNum)
    {
        return false;
    }

    //如果玩家已加入
    if (_.findWhere(gameObj.actors, {uid: data.uid}))
    {
        return false;
    }

    var seat = _.findWhere(gameObj.seatList, {uid: undefined});

    var actor = new Actor(seat.seatNr, data.uid);
    gameObj.actors.push(actor);
    gameObj.currentActorNum++;
    seat.uid = data.uid;

    if (gameObj.maxActor == gameObj.currentActorNum)
    {
        gameObj.isFull = true;
    }

    return true;
}

Game.prototype.addActor2Channel = function(data)
{
    if(!this.channel) {
        return false;
    }
    if(data) {
        this.channel.add(data.uid, data.serverId);
        return true;
    }
    return false;
}

Game.prototype.removeActorFromChannel = function(data) {
    if(!this.channel) {
        return false;
    }
    if(data) {
        this.channel.leave(data.uid, data.serverId);
        return true;
    }
    return false;
};

Game.prototype.ready = function(data)
{
    if (!data || typeof data !== 'object') {
        return consts.ROOM.JOIN_RET_CODE.ERR;
    }

    for (var i in data) {
        if(!data[i] || data[i] <= 0) {
            return consts.ROOM.JOIN_RET_CODE.ERR;
        }
    }

    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor)
    {
        return consts.ROOM.READY_RET_CODE.ERR;
    }

    actor.isReady = true;

    var isAllReady = true;
    for (var act in this.actors)
    {
        if (!this.actors[act].isReady)
        {
            isAllReady = false;
        }
    }
    //全部准备，开始游戏
    if (isAllReady)
    {
        this.isAllReady = true;
    }
    return consts.ROOM.READY_RET_CODE.OK;
}



module.exports = Game;
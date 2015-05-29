var pomelo = require('pomelo');
var _ = require('underscore');
var channelUtil = require('../../util/channelUtil');
var consts = require('../../consts/consts');
var Actor = require('./actor');
var utils = require('../../util/utils');
var gameUtil = require('../../util/gameUtil');



var Game = function(roomId, gameId)
{
    this.room = gameUtil.getRoomById(roomId);

    this.lobbyId = this.room.lobbyId;
    this.gameId = gameId;
    this.maxActor = this.room.maxActor;
    this.currentActorNum = 0;
    this.actors = [];
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



Game.prototype.join = function(data, cb)
{
    if (!data || typeof data !== 'object') {
        cb({code: consts.ROOM.JOIN_RET_CODE.ERR});
        return;
    }

    if (!doAddActor(this, data))
    {
        cb({code: consts.ROOM.JOIN_RET_CODE.ERR});
    }

    if (!this.addActor2Channel(data))
    {
        cb({code: consts.ROOM.JOIN_RET_CODE.ERR});
    }

    var actor = _.findWhere(this.actors, {uid: data.uid});

    actor.setProperties(data.player);

    //push all 包括自己
    //this.channel.pushMessage('onJoin', {actor: actor}, data.serverId, null);

    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    })

    //push其他玩家，除自己外
    if (otherActors.length > 0) {
        var receiver = _.map(otherActors, function (act) {
            return _.pick(act, 'uid', 'sid')
        });

        this.channelService.pushMessageByUids('onJoin', {actor: actor}, receiver, null)
    }


    cb({code: consts.ROOM.JOIN_RET_CODE.OK, actors: otherActors});
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

    var actor = new Actor(seat.seatNr, data.uid, data.sid);
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
        this.channel.add(data.uid, data.sid);
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
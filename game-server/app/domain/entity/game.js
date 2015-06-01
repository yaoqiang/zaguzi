var pomelo = require('pomelo');
var _ = require('underscore');
var channelUtil = require('../../util/channelUtil');
var consts = require('../../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.GAME);
var schedule = require('pomelo-scheduler');
var GameLogic = require('../logic/gameLogic');
var Actor = require('./actor');
var utils = require('../../util/utils');
var gameUtil = require('../../util/gameUtil');


var Game = function (roomId, gameId) {
    this.room = gameUtil.getRoomById(roomId);

    this.lobbyId = this.room.lobbyId;
    this.gameId = gameId;
    this.maxActor = this.room.maxActor;
    this.currentActorNum = 0;
    this.actors = [];
    this.isFull = false;
    this.isAllReady = false;
    this.seatList = [];   //{seatNr:xx, uid:xx}
    this.gameLogic = undefined;
    this.actorsWithLastGame = [];   //上局玩家
    this.bigActorWithLastGame = undefined;  //上把大油
    this.channel = null;
    this.channelService = pomelo.app.get('channelService');

    this.jobQueue = []; //[{uid: xx, jobId}]

    this.init();
}

Game.prototype.init = function () {
    for (var i = 1; i <= this.maxActor; i++) {
        this.seatList.push({seatNr: i, uid: undefined});
    }
    this.createChannel();

}

Game.prototype.createChannel = function () {
    if (this.channel) {
        return this.channel;
    }
    var channelName = channelUtil.getGameChannelName(this.gameId);
    this.channel = this.channelService.getChannel(channelName, true);
    if (this.channel) {
        return this.channel;
    }
    return null;
}


Game.prototype.join = function (data, cb) {
    if (!data || typeof data !== 'object') {
        cb({code: consts.ROOM.JOIN_RET_CODE.ERR});
        return;
    }

    if (!doAddActor(this, data)) {
        cb({code: consts.ROOM.JOIN_RET_CODE.ERR});
    }

    if (!this.addActor2Channel(data)) {
        cb({code: consts.ROOM.JOIN_RET_CODE.ERR});
    }

    var actor = _.findWhere(this.actors, {uid: data.uid});

    actor.setProperties(data.player);

    //push all 包括自己
    //this.channel.pushMessage('onJoin', {actor: actor}, data.sid, null);

    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    })

    //push其他玩家，除自己外
    if (otherActors.length > 0) {
        var receiver = this.getReceiver(otherActors);

        this.channelService.pushMessageByUids(consts.EVENT.JOIN, {actor: actor}, receiver, null)
    }

    cb({code: consts.ROOM.JOIN_RET_CODE.OK, actors: otherActors});
}


/**
 * 添加actor到game
 * @param gameObj
 * @param data
 * @returns {boolean}
 */
function doAddActor(gameObj, data) {
    //如果牌局已满
    if (gameObj.maxActor == gameObj.currentActorNum) {
        return false;
    }

    //如果玩家已加入
    var actorExist = _.findWhere(gameObj.actors, {uid: data.uid});
    if (actorExist && actorExist != undefined) {
        return false;
    }

    var seat = _.findWhere(gameObj.seatList, {uid: undefined});

    var actor = new Actor(seat.seatNr, data.uid, data.sid);
    gameObj.actors.push(actor);
    gameObj.currentActorNum++;
    seat.uid = data.uid;

    if (gameObj.maxActor == gameObj.currentActorNum) {
        gameObj.isFull = true;
    }

    return true;
}

Game.prototype.addActor2Channel = function (data) {
    if (!this.channel) {
        return false;
    }
    if (data) {
        this.channel.add(data.uid, data.sid);
        return true;
    }
    return false;
}

Game.prototype.removeActorFromChannel = function (data) {
    if (!this.channel) {
        return false;
    }
    if (data) {
        this.channel.leave(data.uid, data.serverId);
        return true;
    }
    return false;
};

Game.prototype.ready = function (data, cb) {

    for (var i in data) {
        if (!data[i] || data[i] <= 0) {
            cb({code: consts.ROOM.READY_RET_CODE.ERR});
            return;
        }
    }

    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor) {
        logger.error('game||ready||离开游戏失败, 玩家不在游戏中||用户&ID: %j', data.uid);
        cb({code: consts.ROOM.READY_RET_CODE.ERR});
        return;
    }

    actor.isReady = true;

    var isAllReady = true;
    for (var act in this.actors) {
        if (!this.actors[act].isReady) {
            isAllReady = false;
        }
    }

    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    });

    //push其他玩家，除自己外
    if (otherActors.length > 0) {
        var receiver = this.getReceiver(otherActors);
        this.channelService.pushMessageByUids(consts.EVENT.READY, {
            uid: data.uid,
            actorNr: actor.actorNr
        }, receiver, null)
    }

    cb({code: consts.ROOM.READY_RET_CODE.OK});


    //全部准备，开始游戏
    if (isAllReady) {
        this.isAllReady = true;
        this.start();
    }


}

Game.prototype.start = function () {
    //todo 开始游戏之前判断玩家是否与上局相同, 如果一样则对bigActorWithLastGame赋值

    //拼装GameLogic中需要的结构, 不直接传递game对象, 防止嵌套
    var gameInfo = {actors: this.actors, bigActorWithLastGame: this.bigActorWithLastGame, maxActor: this.maxActor};
    this.gameLogic = new GameLogic(gameInfo);
    this.gameLogic.newGame();

    this.gameLogic.cardsSort(this.actors);

    //组织游戏开始消息数据结构
    var actors = this.actors;

    //将来改为分别单独为每个人发消息，保证牌底只有各自接受各自的
    this.channel.pushMessage(consts.EVENT.START, {actors: actors}, null, this.talkCountdown);

}

/**
 * talking count down.
 */
Game.prototype.talkCountdown = function () {

    this.channel.pushMessage(consts.EVENT.TALK_COUNTDOWN, {
        talker: this.gameLogic.currentTalker,
        second: consts.GAME.TIMER.TALK
    }, null, function () {
        var talkTimeoutReceiver = {uid: this.gameLogic.currentTalker.uid, sid: this.gameLogic.currentTalker.sid};
        var jobId = schedule.scheduleJob({start: Date.now() + consts.GAME.TIMER.TALK * 1000}, function () {
            this.talkTimeout(talkTimeoutReceiver);
        });
        this.jobQueue.push({uid: this.gameLogic.currentTalker.uid, jobId: jobId});

        this.gameLogic.currentTalker = this.gameLogic.getNextActor(this.gameLogic.currentTalker);

    });
}

/**
 * 如果玩家说话超时，向超时玩家发送 说话超时 事件，客户端接受到事件后，直接向服务器端发送talk请求，并且goal=0（即：没话）
 * @param receiver
 */
Game.prototype.talkTimeout = function (receiver) {
    this.channelService.pushMessageByUids(consts.EVENT.TALK_COUNTDOWN_TIMEOUT, {}, receiver, this.talkCountdown)
}

/**
 * 说话阶段
 * @param data {uid:xx, sid:xx, goal:xx, append:xx}
 * @param cb
 */
Game.prototype.talk = function (data, cb) {
    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor || actor == undefined) {
        logger.error('game||talk||说话失败, 玩家不在游戏中||用户&ID: %j', data.uid);
        cb({code: consts.ROOM.TALK_RET_CODE.ERR});
        return;
    }

    var job = _.findWhere(this.jobQueue, {uid: data.uid});
    schedule.cancelJob(job.jobId);

    switch (data.goal) {
        case consts.GAME.IDENTITY.UNKNOW:
            actor.gameStatus.identity = data.goal;
            this.gameLogic.currentTalker = this.gameLogic.getNextActor(this.gameLogic.currentTalker);
            this.gameLogic.talkNumber = this.gameLogic.talkNumber + 1;
            //talker response
            cb({code: consts.ROOM.TALK_RET_CODE.OK, goal: data.goal});
            //push message
            var otherActors = _.filter(this.actors, function (act) {
                return act.uid != data.uid;
            });
            var receiver = this.getReceiver(otherActors);
            this.channelService.pushMessageByUids(consts.EVENT.TALK, {
                uid: data.uid,
                actorNr: actor.actorNr,
                goal: data.goal
            }, receiver, this.gameLogic.talkNumber == this.maxActor ? null : this.talkCountdown)
            break;
        case consts.GAME.IDENTITY.GUZI:

            break;

        case consts.GAME.IDENTITY.HONG3:
            break;
    }

}


Game.prototype.leave = function (data) {
    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor || actor == undefined) {
        logger.error('game||ready||离开游戏失败, 玩家不在游戏中||用户&ID: %j', data.uid);
        return false;
    }
}


Game.prototype.getReceiver = function (actors) {
    return _.map(actors, function (act) {
        return _.pick(act, 'uid', 'sid')
    });
}


module.exports = Game;
var pomelo = require('pomelo');
var _ = require('underscore');
var channelUtil = require('../../util/channelUtil');
var consts = require('../../consts/consts');
var Code = require('../../../../shared/code');
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
    this.gameLogic = null;
    this.actorsWithLastGame = [];   //上局玩家;{uid:xx, actorNr: xx}
    this.bigActorWithLastGame = null;  //上把大油
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
        cb({code: Code.FAIL, err: consts.ERR_CODE.JOIN.ERR});
        return;
    }

    if (!doAddActor(this, data)) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.JOIN.ERR});
    }

    if (!this.addActor2Channel(data)) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.JOIN.ERR});
    }

    var actor = _.findWhere(this.actors, {uid: data.uid});

    actor.setProperties(data.player);

    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    })

    //push其他玩家，除自己外
    if (otherActors.length > 0) {
        var receiver = this.getReceiver(otherActors);

        this.channelService.pushMessageByUids(consts.EVENT.JOIN, {actor: actor}, receiver, null)
    }

    cb({code: Code.OK, actors: otherActors});
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
            cb({code: Code.FAIL, err: consts.ERR_CODE.READY.ERR});
            return;
        }
    }

    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor) {
        logger.error('game||ready||离开游戏失败, 玩家不在游戏中||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.READY.NOT_INT_GAME});
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

    cb({code: Code.OK});


    //全部准备，开始游戏
    if (isAllReady) {
        this.isAllReady = true;
        this.start();
    }


}

Game.prototype.start = function () {
    //标识当前游戏局与上把局玩家是否变化
    var isActorsChanged = false;
    for (var i in this.actors) {
        if (!_.contains(this.actorsWithLastGame, {uid: this.actors[i].uid, actorNr: this.actors[i].actorNr})) {
            isActorsChanged = true;
        }
    }
    //如果有变化，清空上把大油
    if (isActorsChanged) {
        this.bigActorWithLastGame = null;
    }

    //重置玩家牌局状态
    for (var i in this.actors) {
        this.actors[i].gameStatus.reset()
    }
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
        var talkTimeoutActor = {uid: this.gameLogic.currentTalker.uid, sid: this.gameLogic.currentTalker.actorNr};
        var jobId = schedule.scheduleJob({start: Date.now() + consts.GAME.TIMER.TALK * 1000}, function () {
            this.talkTimeout(talkTimeoutActor);
        });
        this.jobQueue.push({uid: this.gameLogic.currentTalker.uid, jobId: jobId});

        this.gameLogic.currentTalker = this.gameLogic.getNextActor(this.gameLogic.currentTalker);

    });
}

/**
 * 如果玩家说话超时，告知所有人该玩家超时没说话
 * @param receiver
 */
Game.prototype.talkTimeout = function (actor) {
    this.channel.pushMessage(consts.EVENT.TALK_COUNTDOWN_TIMEOUT, {actor: actor}, null, null);
    var act = _.findWhere(this.actors, {uid: actor.uid});
    act.gameStatus.identity = consts.GAME.IDENTITY.UNKNOW;
    this.talkCountdown();

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
        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.NOT_IN_GAME});
        return;
    }

    if (!_.isArray(data.append) || !!data.append) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
        logger.error('game||talk||说话失败, 参数错误||用户&ID: %j', data.uid);
        return;
    }

    var job = _.findWhere(this.jobQueue, {uid: data.uid});

    switch (data.goal) {
        case consts.GAME.IDENTITY.UNKNOW:

            actor.gameStatus.identity = data.goal;
            this.gameLogic.currentTalker = this.gameLogic.getNextActor(this.gameLogic.currentTalker);
            this.gameLogic.talkNumber = this.gameLogic.talkNumber + 1;
            break;
        case consts.GAME.IDENTITY.GUZI:
            var cards = actor.gameStatus.getHoldingCards();
            if (this.maxActor == consts.GAME.TYPE.FIVE) {
                if (_.contains(cards, 116) || _.contains(cards, 216)) {
                    logger.error('game||talk||说话失败, 有3叫股子||用户&ID: %j', data.uid);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.GUZI_WITH3, goal: data.goal, append: data.append})
                    return;
                }
                //如果亮巴3
                if (data.append && !!data.append && data.append.length > 0) {
                    for (var i in data.append) {
                        if (data.append[i] != 316 || data.append[i] != 416) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                    }

                }
            }
            else {
                if (_.contains(cards, 116) || _.contains(cards, 216) || _.contains(cards, 316)) {
                    cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.GUZI_WITH3, goal: data.goal, append: data.append})
                    return;
                }

                //如果亮巴3
                if (data.append && !!data.append && data.append.length > 0) {
                    for (var i in data.append) {
                        if (data.append[i] != 416) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                    }

                }

            }

            actor.gameStatus.identity = data.goal;
            this.gameLogic.currentTalker = this.gameLogic.getNextActor(this.gameLogic.currentTalker);
            this.gameLogic.talkNumber = this.gameLogic.talkNumber + 1;

            actor.gameStatus.append = data.append;
            this.gameLogic.base = this.gameLogic.base + data.append.length + 1;
            this.gameLogic.hasTalk = true;
            break;

        case consts.GAME.IDENTITY.HONG3:
            var cards = actor.gameStatus.getHoldingCards();
            if (this.maxActor == consts.GAME.TYPE.FIVE) {
                if (!_.contains(cards, 116) || !_.contains(cards, 216)) {
                    cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.LIANG3_WITHOUT3, goal: data.goal, append: data.append})
                    return;
                }
                //
                if (data.append && !!data.append && data.append.length > 0) {
                    for (var i in data.append) {
                        if (data.append[i] != 316 || data.append[i] != 416) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                    }
                }
            }
            else {
                if (!_.contains(cards, 116) || !_.contains(cards, 216) || !_.contains(cards, 216)) {
                    cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                    return;
                }
                //如果亮巴3
                if (data.append && !!data.append && data.append.length > 0) {
                    for (var i in data.append) {
                        if (data.append[i] != 416) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                    }
                }
            }

            actor.gameStatus.append = data.append;
            this.gameLogic.base = this.gameLogic.base + data.append.length;
            if (_.contains(data.append), 216) this.gameLogic.base = this.gameLogic.base + 1;
            if (_.contains(data.append), 416) this.gameLogic.base = this.gameLogic.base + 1;
            this.gameLogic.hasTalk = true;

            break;
    }
    //说话成功, 取消talkCountdown schedule
    schedule.cancelJob(job.jobId);

    cb({code: Code.OK, goal: data.goal, append: data.append});

    //push message
    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    });
    var receiver = this.getReceiver(otherActors);
    this.channelService.pushMessageByUids(consts.EVENT.TALK, {
        uid: data.uid,
        actorNr: actor.actorNr,
        goal: data.goal,
        append: data.append
    }, receiver, this.gameLogic.talkNumber == this.maxActor - 1 ? this.afterTalk : this.talkCountdown)

};

Game.prototype.afterTalk = function () {
    //如果没人说话，则重新发牌；如果有人说话，则第一个出牌人出牌。
    if (!this.gameLogic.hasTalk) {
        //重新开始
        this.start();
        return;
    }
    this.fanCountdown();
}


Game.prototype.fanCountdown = function () {


}

Game.prototype.fanTimeout = function () {


}


Game.prototype.fan = function () {

}

Game.prototype.leave = function (data, cb) {
    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor || actor == undefined) {
        logger.error('game||leave||离开游戏失败, 玩家不在牌桌中||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.LEAVE.NOT_IN_GAME})
        return;
    }

    if (this.gameLogic != undefined && this.gameLogic.currentPhase != 3) {
        logger.error('game||leave||离开游戏失败, 玩家在游戏中||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.LEAVE.GAMING})
        return;
    }

    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    })

    //push其他玩家，除自己外
    if (otherActors.length > 0) {
        var receiver = this.getReceiver(otherActors);

        this.channelService.pushMessageByUids(consts.EVENT.LEAVE, {actor: actor}, receiver, null)
    }

    this.actors = _.without(this.actors, actor);

    delete actor;

    cb({code: Code.OK});

}


Game.prototype.getReceiver = function (actors) {
    return _.map(actors, function (act) {
        return _.pick(act, 'uid', 'sid')
    });
}


module.exports = Game;
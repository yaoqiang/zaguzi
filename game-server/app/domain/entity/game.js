var pomelo = require('pomelo');
var _ = require('underscore');
var channelUtil = require('../../util/channelUtil');
var consts = require('../../consts/consts');
var Code = require('../../../../shared/code');
var logger = require('pomelo-logger').getLogger(consts.LOG.GAME);
var schedule = require('pomelo-scheduler');
var GameLogic = require('../logic/gameLogic');
var CardLogic = require('../logic/cardLogic');
var Actor = require('./actor');
var utils = require('../../util/utils');
var gameUtil = require('../../util/gameUtil');


var Game = function (roomId, gameId) {
    this.room = gameUtil.getRoomById(roomId);

    this.lobbyId = this.room.lobbyId;
    this.gameId = gameId;
    this.maxActor = this.room.maxActor;
    this.base = this.room.base;
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

    var self = this;

    //如果玩家加入牌桌[?]秒内没准备则自动离开
    var jobId = schedule.scheduleJob({start: Date.now() + consts.GAME.TIMER.NOT_READY * 1000}, function (jobData) {
        logger.info('game||leave||玩家加入游戏后[%j]秒内未准备, 强制离开游戏, ||用户&ID: %j', consts.GAME.TIMER.NOT_READY, jobData.uid);
        self.jobQueue = _.filter(self.jobQueue, function (j) {
            return j.uid != jobData.uid;
        });
        self.leave({uid: jobData.uid}, function (result) {
        });
    }, {uid: data.uid});

    this.jobQueue.push({uid: data.uid, jobId: jobId});

    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    });

    //push其他玩家，除自己外
    if (otherActors.length > 0) {
        var receiver = this.getReceiver(otherActors);

        this.channelService.pushMessageByUids(consts.EVENT.JOIN, {actor: actor}, receiver, null)
    }

    cb({code: Code.OK, actors: this.actors});
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

    var job = _.findWhere(this.jobQueue, {uid: data.uid});
    if (!!job) {
        schedule.cancelJob(job.jobId);
        this.jobQueue = _.filter(this.jobQueue, function (j) {
            return j.jobId != job.jobId;
        });
    }


    if (this.isFull) {
        var exceptedAllReady = true;

        for (var act in this.actors) {
            if (!this.actors[act].isReady) {
                exceptedAllReady = false;
            }
        }

        this.isAllReady = exceptedAllReady;

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
    if (this.isAllReady) {
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

    //释放上局gameLogic
    delete(this.gameLogic);

    //标识玩家身份
    _.each(this.actors, function (v) {
        var cards = v.gameStatus.getHoldingCards();
        if (this.maxActor == consts.GAME.TYPE.FIVE) {
            if (_.contains(cards, 116) || _.contains(cards, 216)) {
                this.gameLogic.red.push({uid: v.uid, actorNr: v.actorNr, isFinished: false});
                //设置玩家真实身份
                if (_.contains(cards, 116)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Heart3)
                if (_.contains(cards, 216)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Diamond3)
            }
            else {
                this.gameLogic.black.push({uid: v.uid, actorNr: v.actorNr, isFinished: false});
                v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.GUZI);
            }
        }
        else
        {
            if (_.contains(cards, 116) || _.contains(cards, 216) || _.contains(cards, 316)) {
                this.gameLogic.red.push({uid: v.uid, actorNr: v.actorNr, isFinished: false});
                //设置玩家真实身份
                if (_.contains(cards, 116)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Heart3)
                if (_.contains(cards, 216)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Diamond3)
                if (_.contains(cards, 316)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Spade3)
            }
            else {
                this.gameLogic.black.push({uid: v.uid, actorNr: v.actorNr, isFinished: false});
                v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.GUZI);
            }
        }

    });

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
        var self = this;
        var talkTimeoutActor = {uid: this.gameLogic.currentTalker.uid, actorNr: this.gameLogic.currentTalker.actorNr};

        //如果玩家[?]秒内没没说话则说话超时：不说话
        var jobId = schedule.scheduleJob({start: Date.now() + consts.GAME.TIMER.TALK * 1000}, function (jobData) {
            logger.info('game||talk||玩家[%j]秒内未说话, 说话超时, ||用户&ID: %j', consts.GAME.TIMER.TALK, jobData.uid);
            self.jobQueue = _.filter(self.jobQueue, function (j) {
                return j.uid != jobData.uid;
            });
            self.talkTimeout(talkTimeoutActor);
        }, {uid: data.uid});

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
            this.gameLogic.share = this.gameLogic.share + data.append.length;
            this.gameLogic.hasTalk = true;
            break;

        case consts.GAME.IDENTITY.HONG3:
            var cards = actor.gameStatus.getHoldingCards();
            if (this.maxActor == consts.GAME.TYPE.FIVE) {
                if (!_.contains(cards, 116) || !_.contains(cards, 216)) {
                    cb({
                        code: Code.FAIL,
                        err: consts.ERR_CODE.TALK.LIANG3_WITHOUT3,
                        goal: data.goal,
                        append: data.append
                    })
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
                if (!_.contains(cards, 116) || !_.contains(cards, 216) || !_.contains(cards, 316)) {
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
            this.gameLogic.share = this.gameLogic.share + data.append.length;
            if (_.contains(data.append), 216 && this.maxActor != consts.GAME.TYPE.SIX) this.gameLogic.share = this.gameLogic.share + 1;
            if (_.contains(data.append), 416) this.gameLogic.share = this.gameLogic.share + 1;
            this.gameLogic.hasTalk = true;

            break;
    }
    var job = _.findWhere(this.jobQueue, {uid: data.uid});
    //说话成功, 取消talkCountdown schedule
    if (!!job) {
        schedule.cancelJob(job.jobId);
        this.jobQueue = _.filter(this.jobQueue, function (j) {
            return j.jobId != job.jobId;
        });
    }

    cb({code: Code.OK, goal: data.goal, append: data.append, share: this.gameLogic.share});

    //push message
    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    });
    var receiver = this.getReceiver(otherActors);
    this.channelService.pushMessageByUids(consts.EVENT.TALK, {
        uid: data.uid,
        actorNr: actor.actorNr,
        goal: data.goal,
        append: data.append,
        share: this.gameLogic.share
    }, receiver, this.gameLogic.talkNumber == this.maxActor - 1 ? this.afterTalk : this.talkCountdown)

};

Game.prototype.afterTalk = function () {
    //如果没人说话，则重新发牌；如果有人说话，则第一个出牌人出牌。
    if (!this.gameLogic.hasTalk) {
        //重新开始
        this.start();
        return;
    }

    //开始出牌
    var actor = _.findWhere(this.actors, {uid: this.gameLogic.firstFanActor.uid});
    //当前BOSS设置为第一个出牌者
    this.gameLogic.currentBoss = actor;
    //设置当前出牌玩家
    this.gameLogic.currentFanActor = actor;
    //设置上手出牌玩家
    this.gameLogic.lastFanActor = actor;
    //设置游戏阶段
    this.gameLogic.currentPhase = consts.GAME.PHASE.FAN
    this.fanCountdown();
}


Game.prototype.fanCountdown = function () {

    //如果上手出牌玩家是当前出牌玩家，则该玩家为上轮Boss
    var isBoss = this.gameLogic.lastFanActor.actorNr == this.currentFanActor.actorNr;
    if (isBoss) {
        this.gameLogic.currentBoss = _.findWhere(this.actors, {actorNr: this.currentFanActor.actorNr});
    }

    var fanTimeoutActor = {uid: this.gameLogic.currentFanActor.uid, actorNr: this.gameLogic.currentFanActor.actorNr};

    //如果玩家已托管
    if (this.gameLogic.currentFanActor.isTrusteeship) {
        this.fanTimeout(fanTimeoutActor);
        //设置下家出牌者，如果下家已出完牌，找下下家，以此类推
        while (this.gameLogic.getNextActor(this.gameLogic.currentFanActor).gameStatus.getHoldingCards().length > 0) {
            this.gameLogic.currentFanActor = this.gameLogic.getNextActor(this.gameLogic.currentFanActor)

        }
        return;
    }

    this.channel.pushMessage(consts.EVENT.FAN_COUNTDOWN, {
        fanActor: this.gameLogic.currentFanActor,
        isBoss: isBoss,
        second: consts.GAME.TIMER.FAN
    }, null, function () {

        var self = true;
        //玩家[%j]秒内未出牌, 出牌超时
        var jobId = schedule.scheduleJob({start: Date.now() + consts.GAME.TIMER.FAN * 1000}, function (jobData) {
            logger.info('game||leave||玩家[%j]秒内未出牌, 出牌超时, ||用户&ID: %j', consts.GAME.TIMER.FAN, jobData.uid);
            self.jobQueue = _.filter(self.jobQueue, function (j) {
                return j.uid != jobData.uid;
            });
            self.fanTimeout(fanTimeoutActor);
        }, {uid: data.uid});


        this.jobQueue.push({uid: fanTimeoutActor.uid, jobId: jobId});

        //设置下家出牌者，如果下家已出完牌，找下下家，以此类推
        while (this.gameLogic.getNextActor(this.gameLogic.currentFanActor).gameStatus.getHoldingCards().length > 0) {
            this.gameLogic.currentFanActor = this.gameLogic.getNextActor(this.gameLogic.currentFanActor)

        }
    });

}

Game.prototype.fanTimeout = function (actor) {

    var act = _.findWhere(this.actors, {uid: actor.uid});
    var cards = [];
    //出牌超时，如果当前出牌者是本轮Boss，则出第一张，如果不是，则不出
    if (this.gameLogic.currentBoss.actorNr == this.currentFanActor.actorNr) {
        cards.push(act.gameStatus.getHoldingCards()[act.gameStatus.currentHoldingCards.length - 1]);
    }
    //如果玩家已托管 - 智能出牌(后期完善)
    if (act.gameStatus.isTrusteeship) {
        //
    }

    act.gameStatus.fanTimeoutTimes = act.gameStatus.fanTimeoutTimes + 1;
    //如果玩家连续2次出牌超时，则托管
    if (act.gameStatus.fanTimeoutTimes == consts.GAME.TRUSTEESHIP.TIMEOUT_TIMES) {
        act.gameStatus.isTrusteeship = true;
        //push 托管消息
        this.channel.pushMessage(consts.EVENT.TRUSTEESHIP, {actor: actor}, null, null);
    }
    this.fan({uid: actor.uid, cards: cards, isTimeout: true}, function () {
    });
}


/**
 * 出牌
 * @param data {uid:xx, cards:[], isTimeout: true/false}
 * @param cb
 */
Game.prototype.fan = function (data, cb) {

    var actor = _.findWhere(this.actors, {uid: data.uid});

    if (!!actor) {
        logger.error('game||fan||出牌错误，非法玩家||用户&ID: %j', data.uid);
        return;
    }

    var cards = data.cards;
    if (!_.isArray(cards) || !!cards || !cards) {
        logger.error('game||fan||出牌错误，非法出牌||用户&ID: %j', data.uid);
        return;
    }

    //如果当前出牌玩家是上轮Boss，并且没有出牌，则非法
    if (this.gameLogic.currentBoss.actorNr == actor.actorNr && cards.length == 0) {
        logger.error('game||fan||出牌错误，Boss玩家不能不出牌||用户&ID: %j', data.uid);
        return;
    }

    var isTimeout = data.isTimeout;

    //
    //push message
    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    });
    var receiver = this.getReceiver(otherActors);

    //玩家不出（传空数组）
    if (cards.length == 0) {
        if (!isTimeout) actor.gameStatus.fanTimeoutTimes = 0;
        if (!isTimeout) actor.gameStatus.isTrusteeship = false;

        //response
        cb({code: Code.OK, cards: cards, series: null});

        //push message
        this.channelService.pushMessageByUids(consts.EVENT.FAN, {
            uid: data.uid,
            actorNr: actor.actorNr,
            cards: cards,
            series: null
        }, receiver, this.fanCountdown);

        var job = _.findWhere(this.jobQueue, {uid: data.uid});
        //出牌成功, 取消fanCountdown schedule
        if (!!job) {
            schedule.cancelJob(job.jobId);
            this.jobQueue = _.filter(this.jobQueue, function (j) {
                return j.jobId != job.jobId;
            });
        }


        return;
    }

    //识别牌型
    var cardRecognization = CardLogic.recognizeSeries(cards, this.game.maxActor, actor.gameStatus.append);
    switch (cardRecognization.cardSeries) {
        case CardLogic.CardSeriesCode.cardSeries_99:
            //错误牌型
            logger.error('game||fan||出牌错误，错误牌型||用户&ID: %j', data.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.ERR});
            break;
        default:
            //玩家手牌中没有所出牌
            if (!actor.gameStatus.hasCards(cards)) {
                logger.error('game||fan||出牌错误，玩家没有该牌||用户&ID: %j', data.uid);
                cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.WITHOUT_CARDS});
                return;
            }


            //如果是Boss出牌，不需比较上手牌
            if (this.gameLogic.currentBoss.actorNr != actor.actorNr) {
                var result = CardLogic.isCurrentBiggerThanLast(cardRecognization, this.gameLogic.lastFanCardRecognization, this.maxActor, actor.gameStatus.append);
                if (!result) {
                    logger.error('game||fan||出牌错误，玩家当前出牌小于上手牌||用户&ID: %j', data.uid);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.NOT_BIGGER});
                    return;
                }
            }

            //设置玩家相关属性
            actor.gameStatus.fanCards(cards);
            if (!isTimeout) actor.gameStatus.fanTimeoutTimes = 0;
            if (!isTimeout) actor.gameStatus.isTrusteeship = false;

            //设置游戏逻辑相关
            this.gameLogic.lastFanActor = actor;
            this.gameLogic.lastFanCards = cards;
            this.gameLogic.lastFanCardRecognization = cardRecognization;


            cb({code: Code.OK, cards: cards, series: cardRecognization.cardSeries});

            var job = _.findWhere(this.jobQueue, {uid: data.uid});
            //出牌成功, 取消fanCountdown schedule
            if (!!job) {
                schedule.cancelJob(job.jobId);
                this.jobQueue = _.filter(this.jobQueue, function (j) {
                    return j.jobId != job.jobId;
                });
            }

            this.channelService.pushMessageByUids(consts.EVENT.FAN, {
                uid: data.uid,
                actorNr: actor.actorNr,
                cards: cards,
                series: cardRecognization.cardSeries
            }, receiver, this.fanCountdown);

            //判断是否已结束
            if (actor.gameStatus.getHoldingCards().length == 0) {
                //设置当前玩家出牌结束，并设置gameLogic中3家和股家的完成情况
                var actorIdentity = _.findWhere(this.gameLogic.red, {uid: actor.uid});
                if (!!actorIdentity) {
                    actorIdentity = _.findWhere(this.gameLogic.black, {uid: actor.uid});
                }
                actorIdentity.isFinished = true;
                if (this.isOver()) {
                    this.over();
                }
            }

    }


}

Game.prototype.isOver = function () {
    var notFinishedByRed = _.contains(this.gameLogic.red, {isFinished: false});
    var notFinishedByBlack = _.contains(this.gameLogic.black, {isFinished: false});

    if (!notFinishedByRed) this.gameLogic.isRedWin = true;

    return !notFinishedByRed || !notFinishedByBlack;
}

Game.prototype.over = function () {
    this.gameLogic.currentPhase = consts.GAME.PHASE.OVER;
    //计算结算结果，push结算消息


    this.channel.pushMessage(consts.EVENT.OVER, {}, null, null);
}

/**
 *
 * @param data {uid:xx}
 * @param cb
 */
Game.prototype.leave = function (data, cb) {

    if (!data || typeof data !== 'object') {
        cb({code: Code.FAIL, err: consts.ERR_CODE.LEAVE.ERR});
        return;
    }

    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor || actor == undefined) {
        logger.error('game||leave||离开游戏失败, 玩家不在牌桌中||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.LEAVE.NOT_IN_GAME})
        return;
    }

    if (this.gameLogic != undefined && this.gameLogic.currentPhase != consts.GAME.PHASE.OVER) {
        logger.error('game||leave||离开游戏失败, 玩家在游戏中||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.LEAVE.GAMING})
        return;
    }

    var job = _.findWhere(this.jobQueue, {uid: data.uid});
    if (!!job) {
        schedule.cancelJob(job.jobId);
        this.jobQueue = _.filter(this.jobQueue, function (j) {
            return j.jobId != job.jobId;
        });
    }

    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    });

    //push其他玩家，除自己外
    if (otherActors.length > 0) {
        var receiver = this.getReceiver(otherActors);

        this.channelService.pushMessageByUids(consts.EVENT.LEAVE, {actor: actor}, receiver, null)
    }

    var seat = _.findWhere(this.seatList, {uid: data.uid});
    seat.uid = undefined;

    this.actors = _.without(this.actors, actor);
    delete actor;


    this.currentActorNum = this.currentActorNum - 1;
    this.isAllReady = false;
    this.isFull = false;

    pomelo.app.rpc.manager.userRemote.onUserLeave(null, data.uid, function () {
        cb({code: Code.OK});
    });


}


Game.prototype.getReceiver = function (actors) {
    return _.map(actors, function (act) {
        return _.pick(act, 'uid', 'sid')
    });
}


module.exports = Game;
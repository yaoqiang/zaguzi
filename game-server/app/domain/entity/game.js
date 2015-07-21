var pomelo = require('pomelo');
var _ = require('underscore');
var channelUtil = require('../../util/channelUtil');
var consts = require('../../consts/consts');
var Code = require('../../../../shared/code');
var logger = require('pomelo-logger').getLogger(consts.LOG.GAME, __filename);
var schedule = require('pomelo-scheduler');
var GameLogic = require('../logic/gameLogic');
var CardLogic = require('../logic/cardLogic');
var Actor = require('./actor');
var utils = require('../../util/utils');
var gameUtil = require('../../util/gameUtil');
var settleService = require('../../services/settleService');
var gameResponse = require('../response/gameResponse');

var async = require('async');


var Game = function (roomId, gameId) {
    this.room = gameUtil.getRoomById(roomId);

    this.lobbyId = this.room.lobbyId;
    this.roomId = this.room.id;
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

Game.prototype.join = function (data, cb) {
    if (!data || typeof data !== 'object') {
        cb({code: Code.FAIL, err: consts.ERR_CODE.JOIN.ERR});
        return;
    }

    if (!this.doAddActor(data)) {
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

        this.channelService.pushMessageByUids(consts.EVENT.JOIN, {actor: gameResponse.generateActorResponse(actor)}, receiver, null)
    }

    cb({code: Code.OK, actors: gameResponse.generateActorsResponse(this.actors)});
}


Game.prototype.ready = function (data, cb) {

    for (var i in data) {
        if (!data[i] || data[i] <= 0) {
            cb({code: Code.FAIL, err: consts.ERR_CODE.READY.ERR});
            return;
        }
    }

    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor) {
        logger.error('game||ready||准备失败, 玩家不在游戏中||用户&ID: %j', data.uid);
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

    var self = this;
    async.waterfall([
            function (callback) {
                cb({code: Code.OK});
                callback()
            }, function (callback) {
                //全部准备，开始游戏
                if (self.isAllReady) {
                    self.start();
                }
                callback();
            }],
        function (err) {
            if (err) {
                logger.error('user||ready||用户准备失败||用户&ID: %j', data.uid);
                return;
            }
        });


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
    for (var i in this.gameLogic) {
        delete this.gameLogic[i];
    }


    //拼装GameLogic中需要的结构, 不直接传递game对象, 防止嵌套
    var gameInfo = {
        actors: this.actors,
        bigActorWithLastGame: this.bigActorWithLastGame,
        maxActor: this.maxActor,
        gameId: this.gameId
    };
    this.gameLogic = new GameLogic(gameInfo);
    this.gameLogic.newGame();

    this.gameLogic.cardsSort(this.actors);

    var self = this;

    //标识玩家身份
    _.map(this.actors, function (v) {
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
        else {
            if (_.contains(cards, 116) || _.contains(cards, 216) || _.contains(cards, 316)) {
                self.gameLogic.red.push({uid: v.uid, actorNr: v.actorNr, isFinished: false});
                //设置玩家真实身份
                if (_.contains(cards, 116)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Heart3)
                if (_.contains(cards, 216)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Diamond3)
                if (_.contains(cards, 316)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Spade3)
            }
            else {
                self.gameLogic.black.push({uid: v.uid, actorNr: v.actorNr, isFinished: false});
                v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.GUZI);
            }
        }

    });


    //
    async.waterfall([
            function (cb) {
                //分别单独为每个人发消息，保证牌底只有各自接受各自的
                _.map(self.actors, function (actor) {
                    var receiver = _.pick(actor, 'uid', 'sid')
                    self.channelService.pushMessageByUids(consts.EVENT.START, {actor: gameResponse.generateActorRichResponse(actor)}, [receiver], null);
                });
                cb()

            },
            function (cb) {
                self.talkCountdown()
                cb();
            }],
        function (err) {
            if (err) {
                logger.error('game||start||游戏开始失败||游戏&ID: %j', self.gameId);
                return;
            }
        });

}

/**
 * talking count down.
 */
Game.prototype.talkCountdown = function () {

    var self = this;

    this.channel.pushMessage(consts.EVENT.TALK_COUNTDOWN,
        gameResponse.generateActorPoorResponseWithSecond(this.gameLogic.currentTalker, consts.GAME.TIMER.TALK),
        null, function () {
            var talkTimeoutActor = {
                uid: self.gameLogic.currentTalker.uid,
                actorNr: self.gameLogic.currentTalker.actorNr
            };

            //如果玩家[?]秒内没没说话则说话超时：不说话
            var jobId = schedule.scheduleJob({start: Date.now() + consts.GAME.TIMER.TALK * 1000}, function (jobData) {
                logger.info('game||talk||玩家[%j]秒内未说话, 说话超时, ||用户&ID: %j', consts.GAME.TIMER.TALK, jobData.uid);
                self.jobQueue = _.filter(self.jobQueue, function (j) {
                    return j.uid != jobData.uid;
                });
                self.talkTimeout(talkTimeoutActor);
            }, {uid: talkTimeoutActor.uid});

            self.jobQueue.push({uid: self.gameLogic.currentTalker.uid, jobId: jobId});

            self.gameLogic.currentTalker = self.gameLogic.getNextActor(self.gameLogic.currentTalker);

        });
}

/**
 * 如果玩家说话超时，告知所有人该玩家超时没说话
 * @param receiver
 */
Game.prototype.talkTimeout = function (actor) {
    this.channel.pushMessage(consts.EVENT.TALK_COUNTDOWN_TIMEOUT, gameResponse.generateActorPoorResponse(actor), null, null);
    var act = _.findWhere(this.actors, {uid: actor.uid});
    act.gameStatus.identity = consts.GAME.IDENTITY.UNKNOW;
    this.gameLogic.talkNumber += 1;
    this.gameLogic.talkTimeoutNumber += 1;

    if (this.gameLogic.talkTimeoutNumber == this.maxActor) {
        this.dissolve()
        return;
    }

    if (this.gameLogic.talkNumber == this.maxActor) {
        this.afterTalk()
    } else {
        this.talkCountdown()
    }

}

/**
 * 所有玩家都说话超时，则强制解散牌局。（防止全部掉线形成僵尸房）
 */
Game.prototype.dissolve = function () {
    logger.info('game||dissolve||牌局里所有玩家都说话超时,强制解散牌局 ||游戏&ID: %j', this.gameId);
    this.gameLogic.currentPhase = consts.GAME.PHASE.OVER;
    var self = this;
    _.map(this.actors, function (actor) {
        self.leave({uid: actor.uid}, function (data) {

        })
    });
    delete(this.gameLogic);
    this.gameLogic = null;
}

/**
 * 说话阶段
 * @param data {uid:xx, goal:xx, append:xx}
 * @param cb
 */
Game.prototype.talk = function (data, cb) {
    var self = this;
    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor || actor == undefined) {
        logger.error('game||talk||说话失败, 玩家不在游戏中||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.NOT_IN_GAME});
        return;
    }

    if (!_.isArray(data.append) || !!data.append == false) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
        logger.error('game||talk||说话失败, 参数错误||用户&ID: %j', data.uid);
        return;
    }

    switch (data.goal) {
        case consts.GAME.IDENTITY.UNKNOW:

            actor.gameStatus.identity = data.goal;
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
                if (data.append && !!data.append && _.size(data.append) > 0) {
                    for (var i in data.append) {
                        if (!_.contains([316, 416], data.append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, data.append[i])) {
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
                if (data.append && !!data.append && _.size(data.append) > 0) {
                    for (var i in data.append) {
                        if (!_.contains([416], data.append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, data.append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                    }

                }

            }

            actor.gameStatus.identity = data.goal;
            this.gameLogic.talkNumber = this.gameLogic.talkNumber + 1;

            actor.gameStatus.append = data.append;
            this.gameLogic.share = this.gameLogic.share + data.append.length + 1;
            this.gameLogic.hasTalk = true;
            break;

        case consts.GAME.IDENTITY.HONG3:
            var cards = actor.gameStatus.getHoldingCards();
            if (this.maxActor == consts.GAME.TYPE.FIVE) {
                if (!_.contains(cards, 116) && !_.contains(cards, 216)) {
                    cb({
                        code: Code.FAIL,
                        err: consts.ERR_CODE.TALK.LIANG3_WITHOUT3,
                        goal: data.goal,
                        append: data.append
                    })
                    return;
                }
                //
                if (data.append && !!data.append && _.size(data.append) > 0) {
                    if (!_.contains(data.append, 116) && !_.contains(data.append, 216)) {
                        logger.info('game||talk||玩家[%j]亮3附加牌里没有红3，非法操作 ||用户&ID: %j', data.uid, data.uid);
                        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                        return;
                    }
                    for (var i in data.append) {
                        if (!_.contains([116, 216, 316, 416], data.append[i])) {
                            logger.info('game||talk||玩家[%j]亮3附加其他牌，非法操作 ||用户&ID: %j', data.uid, data.uid);
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, data.append[i])) {
                            logger.info('game||talk||玩家[%j]没3亮3，非法操作 ||用户&ID: %j', data.uid, data.uid);
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                    }
                }
                else {
                    logger.info('game||talk||玩家[%j]亮3时没用附加牌，非法操作 ||用户&ID: %j', data.uid, data.uid);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                    return;
                }
            }
            else {
                if (!_.contains(cards, 116) && !_.contains(cards, 216) && !_.contains(cards, 316)) {
                    cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.LIANG3_WITHOUT3, goal: data.goal, append: data.append})
                    return;
                }
                //
                if (data.append && !!data.append && _.size(data.append) > 0) {
                    if (!_.contains(data.append, 116) && !_.contains(data.append, 216) && !_.contains(data.append, 316)) {
                        logger.info('game||talk||玩家[%j]亮3附加牌里没有红3，非法操作 ||用户&ID: %j', data.uid, data.uid);
                        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                        return;
                    }
                    for (var i in data.append) {
                        if (!_.contains([116, 216, 316, 416], data.append[i])) {
                            logger.info('game||talk||玩家[%j]亮3附加其他牌，非法操作 ||用户&ID: %j', data.uid, data.uid);
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, data.append[i])) {
                            logger.info('game||talk||玩家[%j]没3亮3，非法操作 ||用户&ID: %j', data.uid, data.uid);
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                            return;
                        }
                    }
                }
                else {
                    logger.info('game||talk||玩家[%j]亮3时没用附加牌，非法操作 ||用户&ID: %j', data.uid, data.uid);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                    return;
                }
            }

            actor.gameStatus.identity = data.goal;
            this.gameLogic.talkNumber = this.gameLogic.talkNumber + 1;

            actor.gameStatus.append = data.append;
            this.gameLogic.share = this.gameLogic.share + data.append.length;
            if (_.contains(data.append, 216) && this.maxActor != consts.GAME.TYPE.SIX) this.gameLogic.share = this.gameLogic.share + 1;
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
    }, receiver, function () {
        if (self.gameLogic.talkNumber == self.maxActor) {
            self.afterTalk();
        }
        else {
            self.talkCountdown();
        }
    })

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

    var self = this;
    //如果上手出牌玩家是当前出牌玩家，则该玩家为上轮Boss
    var isBoss = (this.gameLogic.lastFanActor && _.property('actorNr')(this.gameLogic.lastFanActor) == this.gameLogic.currentFanActor.actorNr) ||
        (this.gameLogic.isGiveLogic &&
        this.gameLogic.giveLogicFanRound > 0 &&
        this.gameLogic.lastFanOverNextCountdownActor.uid == this.gameLogic.currentFanActor.uid);
    if (isBoss) {
        this.gameLogic.currentBoss = _.findWhere(this.actors, {actorNr: this.gameLogic.currentFanActor.actorNr});
    }

    var fanTimeoutActor = {uid: this.gameLogic.currentFanActor.uid, actorNr: this.gameLogic.currentFanActor.actorNr};

    console.log('### isTrusteeship => ', this.gameLogic.currentFanActor.uid, this.gameLogic.currentFanActor.isTrusteeship)
    //如果玩家已托管
    if (this.gameLogic.currentFanActor.isTrusteeship) {
        this.fanTimeout(fanTimeoutActor);
        return;
    }

    this.channel.pushMessage(consts.EVENT.FAN_COUNTDOWN, {
        actor: {uid: this.gameLogic.currentFanActor.uid, actorNr: this.gameLogic.currentFanActor.actorNr},
        isBoss: isBoss,
        lastFanCardRecognization: this.gameLogic.lastFanCardRecognization,
        second: consts.GAME.TIMER.FAN
    }, null, function () {

        //玩家[%j]秒内未出牌, 出牌超时
        var jobId = schedule.scheduleJob({start: Date.now() + consts.GAME.TIMER.FAN * 1000}, function (jobData) {
            logger.info('game||fan||玩家[%j]秒内未出牌, 出牌超时, ||用户&ID: %j', consts.GAME.TIMER.FAN, jobData.uid);
            self.jobQueue = _.filter(self.jobQueue, function (j) {
                return j.uid != jobData.uid;
            });
            self.fanTimeout(fanTimeoutActor);
        }, {uid: self.gameLogic.currentFanActor.uid});


        self.jobQueue.push({uid: fanTimeoutActor.uid, jobId: jobId});

    });

}

Game.prototype.fanTimeout = function (actor) {

    var act = _.findWhere(this.actors, {uid: actor.uid});
    var cards = [];
    //出牌超时，如果当前出牌者是本轮Boss，则出第一张，如果不是，则不出
    if (this.gameLogic.currentBoss.actorNr == this.gameLogic.currentFanActor.actorNr) {
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
        this.channel.pushMessage(consts.EVENT.TRUSTEESHIP, gameResponse.generateActorPoorResponse(actor), null, null);
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
    var self = this;
    var actor = _.findWhere(this.actors, {uid: data.uid});

    if (!!actor == false) {
        logger.error('game||fan||出牌错误，非法玩家||用户&ID: %j', data.uid);
        cb({code: Code.FAIL});
        return;
    }

    var cards = data.cards;
    if (!_.isArray(cards) || !!cards == false || !cards) {
        logger.error('game||fan||出牌错误，非法出牌||用户&ID: %j', data.uid);
        cb({code: Code.FAIL});
        return;
    }

    //如果当前出牌玩家是上轮Boss，并且没有出牌，则非法
    if (this.gameLogic.currentBoss.actorNr == actor.actorNr && cards.length == 0) {
        logger.error('game||fan||出牌错误，Boss玩家不能不出牌||用户&ID: %j', data.uid);
        cb({code: Code.FAIL});
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
        cb({code: Code.OK, cards: cards, cardRecognization: null});

        var job = _.findWhere(this.jobQueue, {uid: data.uid});
        //出牌成功, 取消fanCountdown schedule
        if (!!job) {
            schedule.cancelJob(job.jobId);
            this.jobQueue = _.filter(this.jobQueue, function (j) {
                return j.jobId != job.jobId;
            });
        }

        //如果是接风环节，设置接风出牌round
        if (this.gameLogic.isGiveLogic) {
            this.gameLogic.giveLogicFanRound += 1;
        }

        //设置下家出牌者，如果下家已出完牌，找下下家，以此类推
        var nextFanActor = this.gameLogic.getNextActor(this.gameLogic.currentFanActor);
        while (true) {
            if (nextFanActor.gameStatus.getHoldingCards().length > 0) {
                this.gameLogic.currentFanActor = nextFanActor;
                break;
            }
            nextFanActor = this.gameLogic.getNextActor(nextFanActor);
        }

        //push message
        this.channelService.pushMessageByUids(consts.EVENT.FAN, {
            uid: data.uid,
            actorNr: actor.actorNr,
            cards: cards,
            cardRecognization: null
        }, receiver, function () {
            self.fanCountdown();
        });

        return;
    }

    //识别牌型
    var cardRecognization = CardLogic.recognizeSeries(cards, this.maxActor, actor.gameStatus.append);
    console.log('########### cardRecognization => ', cardRecognization)
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


            //如果不是Boss出牌，则需比较上手牌
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


            cb({code: Code.OK, cards: cards, cardRecognization: cardRecognization});

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
                cardRecognization: cardRecognization
            }, receiver, function () {
                //判断是否已结束
                if (actor.gameStatus.getHoldingCards().length == 0) {
                    //设置当前玩家出牌结束，并设置gameLogic中3家和股家的完成情况
                    var actorIdentity = _.findWhere(self.gameLogic.red, {uid: actor.uid});
                    if (_.isUndefined(actorIdentity)) {
                        actorIdentity = _.findWhere(self.gameLogic.black, {uid: actor.uid});
                    }
                    actorIdentity.isFinished = true;

                    //所有玩家出牌完成状态
                    var actorStatusCount = _.countBy(_.flatten([self.gameLogic.red, self.gameLogic.black]), function (actorStatus) {
                        return actorStatus.isFinished == true ? 'finished' : 'notFinished'
                    });

                    //大油:第一个出完牌的玩家
                    if (actorStatusCount.finished == 1) {
                        self.bigActorWithLastGame = {uid: actorIdentity.uid, actorNr: actorIdentity.actorNr};
                    }

                    //判断牌局是否结束
                    if (self.isOver()) {
                        self.over();
                        return;
                    }

                    self.gameLogic.isGiveLogic = true;
                    self.gameLogic.giveLogicFanRound = 0;
                    self.gameLogic.lastFanOverNextCountdownActor = actor;

                    //设置下家出牌者，如果下家已出完牌，找下下家，以此类推
                    var nextFanActor = self.gameLogic.getNextActor(self.gameLogic.lastFanOverNextCountdownActor);
                    while (true) {
                        if (nextFanActor.gameStatus.getHoldingCards().length > 0) {
                            self.gameLogic.lastFanOverNextCountdownActor = nextFanActor;
                            break;
                        }
                        nextFanActor = self.gameLogic.getNextActor(nextFanActor);
                    }
                }
                else {
                    //如果是接风环节，此次出牌代表有人接了，reset接风设置
                    if (self.gameLogic.isGiveLogic) {
                        self.gameLogic.isGiveLogic = false;
                        self.gameLogic.giveLogicFanRound = 0;
                        self.gameLogic.lastFanOverNextCountdownActor = null;
                    }
                }
                //设置下家出牌者，如果下家已出完牌，找下下家，以此类推
                var nextFanActor = self.gameLogic.getNextActor(self.gameLogic.currentFanActor);
                while (true) {
                    if (nextFanActor.gameStatus.getHoldingCards().length > 0) {
                        self.gameLogic.currentFanActor = nextFanActor;
                        break;
                    }
                    nextFanActor = self.gameLogic.getNextActor(nextFanActor);
                }
                self.fanCountdown()
            });

    }

}

Game.prototype.isOver = function () {
    var notFinishedByRed = _.findWhere(this.gameLogic.red, {isFinished: false});
    var notFinishedByBlack = _.findWhere(this.gameLogic.black, {isFinished: false});

    if (_.isUndefined(notFinishedByRed)) this.gameLogic.isRedWin = true;

    return _.isUndefined(notFinishedByRed) || _.isUndefined(notFinishedByBlack);
}

Game.prototype.over = function () {
    this.gameLogic.currentPhase = consts.GAME.PHASE.OVER;

    var self = this;
    settleService.settle(this, function () {
        self.actorsWithLastGame = self.actors;
    });

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

    if (this.gameLogic != null && this.gameLogic.currentPhase != consts.GAME.PHASE.OVER) {
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

    //push leave event
    var receiver = this.getReceiver(this.actors);

    this.channelService.pushMessageByUids(consts.EVENT.LEAVE, gameResponse.generateActorPoorResponse(actor), receiver, null)


    var seat = _.findWhere(this.seatList, {uid: data.uid});
    seat.uid = undefined;

    this.removeActorFromChannel({uid: actor.uid, serverId: actor.sid});

    this.actors = _.without(this.actors, actor);
    for (var i in actor) {
        delete actor[i];
    }

    logger.info('game||leave||离开游戏成功||用户&ID: %j', data.uid);

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

/**
 * 添加actor到game
 * @param gameObj
 * @param data
 * @returns {boolean}
 */
Game.prototype.doAddActor = function (data) {
    //如果牌局已满
    if (this.maxActor == this.currentActorNum) {
        return false;
    }

    //如果玩家已加入
    var actorExist = _.findWhere(this.actors, {uid: data.uid});
    if (actorExist && actorExist != undefined) {
        return false;
    }

    var seat = _.findWhere(this.seatList, {uid: undefined});

    var actor = new Actor(seat.seatNr, data.uid, data.sid);
    this.actors.push(actor);
    this.currentActorNum++;
    seat.uid = data.uid;

    if (this.maxActor == this.currentActorNum) {
        this.isFull = true;
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


module.exports = Game;
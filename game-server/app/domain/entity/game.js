var pomelo = require('pomelo-rt');
var _ = require('lodash');
var channelUtil = require('../../util/channelUtil');
var consts = require('../../consts/consts');
var Code = require('../../../../shared/code');
var logger = require('log4js').getLogger(consts.LOG.GAME);
var loggerErr = require('log4js').getLogger(consts.LOG.ERROR);
var schedule = require('pomelo-scheduler');
var GameLogic = require('../logic/gameLogic');
var CardLogic = require('../logic/cardLogic');
var Actor = require('./actor');
var utils = require('../../util/utils');
var gameUtil = require('../../util/gameUtil');
var balanceService = require('../../services/balanceService');
var gameService = require('../../services/gameService');
var gameResponse = require('../response/gameResponse');

var async = require('async');
var Promise = require('promise');


/**
 *
 * @param roomId
 * @param gameId
 * @param args 私人场参数
 * @constructor
 */
var Game = function (roomId, gameId, args) {
    this.room = gameUtil.getRoomById(roomId);

    this.lobbyId = this.room.lobbyId;
    this.roomId = this.room.id;
    this.gameId = gameId;
    this.maxActor = this.room.maxActor;
    this.base = this.room.base;
    this.useNoteCard = this.room.useNoteCard;   //是否可用记牌器
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

    //几次没人说话, 3次解散房间, 3个地方会设置该值, 1: 初始化牌局(此处), 2: 都没人说话会++, 3: 游戏结束会重置为0
    this.nobodyTalkTime = 0;

    this.isPrivate = false;

    //私人场
    if (args !== undefined && typeof args === 'object') {
        this.isPrivate = true;
        this.name = args.name || '';
        this.password = args.password || null;
        this.maxActor = args.maxActor;
        this.base = args.base;
        this.useNoteCard = args.useNoteCard;
    }

    this.init();
}

Game.prototype.init = function () {
    for (var i = 1; i <= this.maxActor; i++) {
        this.seatList.push({seatNr: i, uid: undefined});
    }
    this.createChannel();

    var self = this;

    //房间意外巡检..
    schedule.scheduleJob({period: 120 * 1000}, function (jobData) {
        //如果牌局是开始状态
        if (self.gameLogic && self.gameLogic.currentPhase !== consts.GAME.PHASE.OVER) {
            
            //如果当前牌局玩家和gameLogic的玩家不同, 则表示出现问题了. 直接强制解散
            //造成问题的原因是:当房间最后一位ready后 进入start逻辑, 这时游戏状态还未初始化完成, 恰巧有玩家离开.
            //这时候凡是根据GameLogic找到玩家的消息依就会错乱.因为new GameLogic时候的玩家和当前不同, 导致僵尸房
            if (_.size(_.difference(_.pluck(self.actors, 'uid'), _.pluck(self.gameLogic.game.actors, 'uid'))) > 0) {
                loggerErr.error("检测出问题房间: %o", {gameId: self.gameId, gameLogic: self.gameLogic, actors: self.actors});
                self.dissolve();
            }
        }
    }, {});
}

Game.prototype.join = function (data, cb) {
    if (!data || typeof data !== 'object') {
        logger.debug('%j', {method: "entity.game.join", uid: data.uid, data: data, desc: '加入房间时, 参数不是object, 非法参数.'});
        cb({code: Code.FAIL, err: consts.ERR_CODE.JOIN.ERR});
        return;
    }

    logger.debug("###doAddActor start -> ")
    if (!this.doAddActor(data)) {
        logger.debug("###doAddActor error -> ")
        cb({code: Code.FAIL, err: consts.ERR_CODE.JOIN.IN_GAME});
        return;
    }

    logger.debug("###addActor2Channel start -> ")
    if (!this.addActor2Channel(data)) {
        logger.debug("###addActor2Channel err -> ")
        cb({code: Code.FAIL, err: consts.ERR_CODE.JOIN.ERR});
        return;
    }

    var actor = _.findWhere(this.actors, {uid: data.uid});

    actor.setProperties(data.player);

    //如果玩家加入牌桌[?]秒内没准备则自动离开
    this.scheduleNotReady({uid: data.uid});


    var otherActors = _.filter(this.actors, function (act) {
        return act.uid != data.uid;
    });

    //push其他玩家，除自己外
    if (otherActors.length > 0) {
        var receiver = this.getReceiver(otherActors);

        this.channelService.pushMessageByUids(consts.EVENT.JOIN, {actor: gameResponse.generateActorResponse(actor)}, receiver, null)
    }

    cb({code: Code.OK, actors: gameResponse.generateActorsResponse(this.actors)});
    logger.debug("###join end -> ")
}


Game.prototype.ready = function (data, cb) {

    //for (var i in data) {
    //    if (!data[i] || data[i] <= 0) {
    //        cb({code: Code.FAIL, err: consts.ERR_CODE.READY.ERR});
    //        return;
    //    }
    //}

    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor) {
        logger.debug('game||ready||准备失败, 玩家不在游戏中||用户&ID: %j', data.uid);
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

        _.each(this.actors, function(act) {
            if (!act.isReady) {
                exceptedAllReady = false;
            }
        });


        this.isAllReady = exceptedAllReady;

    }

    this.channel.pushMessage(consts.EVENT.READY, {
        uid: data.uid,
        actorNr: actor.actorNr
    }, null, null)

   

    //检查玩家是否都准备, 如果都准备则开始游戏
    if (this.isAllReady) {
        this.start(cb);
    }
    else {
        //向准备玩家发送准备成功响应
        cb({code: Code.OK});
    }
}

Game.prototype.start = function (cb) {
    var self = this;

    ////////////////////////////////////////////////////
    //////// Note: 居然偶尔的偶尔会出现问题, 导致已经换人, 但是还计算出上把老大, 而且上把老大可能已下线, 总之导致僵尸房
    /////// Note2: 这个问题应该不是大油选举导致, 初步定位是执行顺序问题.
    ///////////////
    //标识当前游戏局与上把局玩家是否变化
    // var isActorsChanged = false;
    // _.each(this.actors, function (act) {
    //    if (_.isUndefined(_.findWhere(self.actorsWithLastGame, {
    //            uid: act.uid,
    //            actorNr: act.actorNr
    //        }))) {
    //        isActorsChanged = true;
    //    }
    
    //    //重置玩家牌局状态
    //    act.gameStatus.reset()
    
    // });
    // //如果有变化，清空上把大油
    // if (isActorsChanged) {
    //    this.bigActorWithLastGame = null;
    // }

    //
    _.each(this.actors, function (act) {
        //重置玩家牌局状态
        act.gameStatus.reset()
    });

    //标识上把大油=null,
    this.bigActorWithLastGame = null;


    //拼装GameLogic中需要的结构, 不直接传递game对象, 防止嵌套
    var gameInfo = {
        actors: this.actors,
        bigActorWithLastGame: this.bigActorWithLastGame,
        maxActor: this.maxActor,
        gameId: this.gameId
    };
    this.gameLogic = null;
    this.gameLogic = new GameLogic(gameInfo);
    this.gameLogic.newGame();

    this.gameLogic.cardsSort(this.actors);

    //在这里执行ready请求的callback, 保证游戏状态初始化完毕, 避免在ready后初始化游戏状态前, 客户端离开房间
    if (cb) cb({code: Code.OK});

    var self = this;

    //标识玩家身份
    _.map(this.actors, function (v) {
        var cards = v.gameStatus.getHoldingCards();
        if (self.maxActor == consts.GAME.TYPE.FIVE) {
            if (_.contains(cards, 116) || _.contains(cards, 216)) {
                self.gameLogic.red.push({uid: v.uid, actorNr: v.actorNr, isFinished: false});
                //设置玩家真实身份
                if (_.contains(cards, 116)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Diamond3)
                if (_.contains(cards, 216)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Heart3)
            }
            else {
                self.gameLogic.black.push({uid: v.uid, actorNr: v.actorNr, isFinished: false});
                v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.GUZI);
            }
        }
        else {
            if (_.contains(cards, 116) || _.contains(cards, 216) || _.contains(cards, 316)) {
                self.gameLogic.red.push({uid: v.uid, actorNr: v.actorNr, isFinished: false});
                //设置玩家真实身份
                if (_.contains(cards, 116)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Diamond3)
                if (_.contains(cards, 216)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Heart3)
                if (_.contains(cards, 316)) v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.Spade3)
            }
            else {
                self.gameLogic.black.push({uid: v.uid, actorNr: v.actorNr, isFinished: false});
                v.gameStatus.actualIdentity.push(consts.GAME.ACTUAL_IDENTITY.GUZI);
            }
        }

    });

    //
    Promise.all(_.map(self.actors, function (actor) {
            var receiver = _.pick(actor, 'uid', 'sid');
            //分别单独为每个人发消息，保证牌底只有各自接受各自的, 如果有记牌器, 则添加记牌器
            self.channelService.pushMessageByUids(consts.EVENT.START, {actor: gameResponse.generateActorRichResponse(actor, self.useNoteCard, self.gameLogic.originalCards)}, [receiver], function () {
            });
            return Promise.resolve;
        }))
        .then(function () {
            self.gameLogic.currentPhase = consts.GAME.PHASE.TALKING;
            self.talkCountdown();
        })
        .catch(function (err) {
            loggerErr.error('%j', {gameId: self.gameId, type: consts.LOG.CONF.GAME.TYPE, action: consts.LOG.CONF.GAME.START,
                message: '游戏开始失败'+err.toString(), createdAt: new Date()});
        })
        .done();

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
                logger.debug('game||talk||玩家[%j]秒内未说话, 说话超时, ||用户&ID: %j', consts.GAME.TIMER.TALK, jobData.uid);
                self.jobQueue = _.filter(self.jobQueue, function (j) {
                    return j.uid != jobData.uid;
                });
                if (talkTimeoutActor.uid == jobData.uid) {
                    self.talkTimeout(talkTimeoutActor);
                }
                else {
                    logger.debug('game||talk||玩家说话时, 倒计时发生问题, schedule的uid和当前说话的uid是一人, 当前:%s -- schedule:%s', talkTimeoutActor.uid, jobData.uid);
                }
            }, {uid: talkTimeoutActor.uid});

            self.jobQueue.push({uid: self.gameLogic.currentTalker.uid, jobId: jobId});


        });
}

/**
 * 如果玩家说话超时，告知所有人该玩家超时没说话
 * @param actor
 */
Game.prototype.talkTimeout = function (actor) {

    //消息貌似没用
    //this.channel.pushMessage(consts.EVENT.TALK_COUNTDOWN_TIMEOUT, gameResponse.generateActorPoorResponse(actor), null, null);

    this.talk({uid: actor.uid, append: [], goal: consts.GAME.IDENTITY.UNKNOW}, function () {
        //
    });

}

/**
 * 重开次数达到上限，则强制解散牌局。
 */
Game.prototype.dissolve = function () {
    logger.debug('game||dissolve||牌局里重开次数达到上限,强制解散牌局 ||游戏&ID: %j', this.gameId);
    this.gameLogic.currentPhase = consts.GAME.PHASE.OVER;
    
    var self = this;
    //取消所有schedule
    _.each(this.jobQueue, function (job) {
        if (!!job) {
            schedule.cancelJob(job.jobId);
            self.jobQueue = _.filter(self.jobQueue, function (j) {
                return j.jobId != job.jobId;
            });
        }
    });
    _.map(this.actors, function (actor) {
        self.leave({uid: actor.uid}, function (data) {

        })
    });
    //解散后,重置牌桌设置
    this.nobodyTalkTime = 0;
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
        logger.debug('game-talk||%j||说话失败, 玩家不在游戏中||用户&ID: %j', data.uid, data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.NOT_IN_GAME});
        return;
    }

    if (!_.isArray(data.append) || !!data.append == false) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.PARAMETER_ERR, goal: data.goal, append: data.append})
        logger.debug('game-talk||%j||说话失败, 参数错误||用户&ID: %j', data.uid, data.uid);
        return;
    }

    if (this.gameLogic.currentTalker.uid != data.uid) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.NOT_YOU})
        logger.debug('game-talk||%j - %j - %j - %j||说话失败, 不轮到当前玩家说话||用户&ID: %j', this.gameLogic.currentTalker.uid, data.goal, data.append, data.uid, data.uid);
        return;
    }

    if (this.gameLogic.talkNumber == this.maxActor || actor.gameStatus.hasTalk) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ALREADY_TALK})
        logger.debug('game-talk||%j||说话失败, 用户重复说话, 可能因为客户端点击2次..||用户&ID: %j', data.uid, data.uid);
        return;
    }

    if (this.gameLogic.currentPhase !== consts.GAME.PHASE.TALKING) {
        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.NOT_IN_GAME})
        logger.debug('game-talk||%j||说话失败, 玩家不在游戏中, 可能是网络状况导致客户端在结束状态时仍显示说话操作||用户&ID: %j', data.uid, data.uid);
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
                    logger.debug('game||talk||说话失败, 有3叫股子||用户&ID: %j', data.uid);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.GUZI_WITH3, goal: data.goal, append: data.append})
                    return;
                }
                //如果亮巴3
                if (data.append && !!data.append && _.size(data.append) > 0) {
                    for (var i = 0; i < data.append.length; i++) {
                        if (!_.contains([316, 416], data.append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.GUZI_APPEND_NOT_3, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, data.append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.GUZI_APPEND_NOT_HOLDING_CARD, goal: data.goal, append: data.append})
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
                    for (var i = 0; i < data.append.length; i++) {
                        if (!_.contains([416], data.append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.GUZI_APPEND_NOT_3, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, data.append[i])) {
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.GUZI_APPEND_NOT_HOLDING_CARD, goal: data.goal, append: data.append})
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
                        logger.debug('game||talk||玩家[%j]亮3附加牌里没有红3，非法操作 ||用户&ID: %j', data.uid, data.uid);
                        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.LIANG3_APPEND_NOT_3, goal: data.goal, append: data.append})
                        return;
                    }
                    for (var i = 0; i < data.append.length; i++) {
                        if (!_.contains([116, 216, 316, 416], data.append[i])) {
                            logger.debug('game||talk||玩家[%j]亮3附加其他牌，非法操作 ||用户&ID: %j', data.uid, data.uid);
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.LIANG3_APPEND_NOT_3, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, data.append[i])) {
                            logger.debug('game||talk||玩家[%j]没3亮3，非法操作 ||用户&ID: %j', data.uid, data.uid);
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.LIANG3_APPEND_NOT_HOLDING_CARD, goal: data.goal, append: data.append})
                            return;
                        }
                    }
                }
                else {
                    logger.debug('game||talk||玩家[%j]亮3时没用附加牌，非法操作 ||用户&ID: %j', data.uid, data.uid);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                    return;
                }
            }
            else {
                if (!_.contains(cards, 116) && !_.contains(cards, 216) && !_.contains(cards, 316)) {
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
                    if (!_.contains(data.append, 116) && !_.contains(data.append, 216) && !_.contains(data.append, 316)) {
                        logger.debug('game||talk||玩家[%j]亮3附加牌里没有红3，非法操作 ||用户&ID: %j', data.uid, data.uid);
                        cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.LIANG3_APPEND_NOT_3, goal: data.goal, append: data.append})
                        return;
                    }
                    for (var i = 0; i < data.append.length; i++) {
                        if (!_.contains([116, 216, 316, 416], data.append[i])) {
                            logger.debug('game||talk||玩家[%j]亮3附加其他牌，非法操作 ||用户&ID: %j', data.uid, data.uid);
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.LIANG3_APPEND_NOT_3, goal: data.goal, append: data.append})
                            return;
                        }
                        if (!_.contains(cards, data.append[i])) {
                            logger.debug('game||talk||玩家[%j]没3亮3，非法操作 ||用户&ID: %j', data.uid, data.uid);
                            cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.LIANG3_APPEND_NOT_HOLDING_CARD, goal: data.goal, append: data.append})
                            return;
                        }
                    }
                }
                else {
                    logger.debug('game||talk||玩家[%j]亮3时没用附加牌，非法操作 ||用户&ID: %j', data.uid, data.uid);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.TALK.ERR, goal: data.goal, append: data.append})
                    return;
                }
            }

            actor.gameStatus.identity = data.goal;
            this.gameLogic.talkNumber = this.gameLogic.talkNumber + 1;

            actor.gameStatus.append = data.append;

            _.each(data.append, function (item) {
                self.gameLogic.appends.push(item);
            })

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

    //设置actor已说话
    actor.gameStatus.hasTalk = true;

    cb({code: Code.OK, goal: data.goal, append: data.append, share: this.gameLogic.share});

    this.channel.pushMessage(consts.EVENT.TALK, {
        uid: data.uid,
        actorNr: actor.actorNr,
        goal: data.goal,
        append: data.append,
        share: this.gameLogic.share
    }, null, function () {

        if (self.gameLogic.talkNumber == self.maxActor) {
            if (self.gameLogic.share == 0) {
                self.nobodyTalkTime += 1;
                if (self.nobodyTalkTime == consts.GAME.DISSOLVE_NOBODY_TALK_TIME) {
                    //没人说话牌局重开次数达到上限, 解散牌桌
                    self.channel.pushMessage(consts.EVENT.DISSOLVE_GAME, {}, null, function() {
                        self.dissolve();
                    });
                }
                else {
                    //没人说话，发送重新开始消息
                    self.channel.pushMessage(consts.EVENT.RESTART_GAME, {}, null, function() {
                        self.start();
                    });
                }
                return;
            }
            self.afterTalk();
        }
        else {

            self.gameLogic.currentTalker = self.gameLogic.getNextActor(self.gameLogic.currentTalker);

            self.talkCountdown();
        }
    })

};

Game.prototype.afterTalk = function () {
    var self = this;

    //设置上局玩家[{uid:xx, actorNr: xx}]
    _.each(this.actors, function (actor) {
        self.actorsWithLastGame.push({uid: actor.uid, actorNr: actor.actorNr})
    });

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

    this.channel.pushMessage(consts.EVENT.AFTER_TALK, {}, null, function () {
        self.fanCountdown();
    });
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
    else {
        this.gameLogic.currentBoss = _.findWhere(this.actors, {actorNr: this.gameLogic.lastFanActor.actorNr});
    }

    var fanTimeoutActor = {uid: this.gameLogic.currentFanActor.uid, actorNr: this.gameLogic.currentFanActor.actorNr};


    //countdown时间, 默认是出牌时间
    var countDownSecond = consts.GAME.TIMER.FAN;

    //如果托管状态, countdown时间就是托管时间
    if (this.gameLogic.currentFanActor.gameStatus.isTrusteeship) {
        logger.debug('game||fan||玩家[%j]托管出牌, ||用户&ID: %j, actorNr: %j', this.gameLogic.currentFanActor.properties.nickName, this.gameLogic.currentFanActor.uid, this.gameLogic.currentFanActor.actorNr);
        countDownSecond = consts.GAME.TIMER.TRUSTEESHIP;
    }

    this.channel.pushMessage(consts.EVENT.FAN_COUNTDOWN, {
        actor: {uid: this.gameLogic.currentFanActor.uid, actorNr: this.gameLogic.currentFanActor.actorNr},
        isBoss: isBoss,
        lastFanCardRecognization: this.gameLogic.lastFanCardRecognization,
        second: countDownSecond
    }, null, function () {
        //玩家[%j]秒内未出牌, 出牌超时
        var jobId = schedule.scheduleJob({start: Date.now() + countDownSecond * 1000}, function (jobData) {
            logger.debug('game||fan||玩家[%j][%j]秒内未出牌, 出牌超时, ||用户&ID: %j, actorNr: %j, 超时次数: %j', self.gameLogic.currentFanActor.properties.nickName, consts.GAME.TIMER.FAN, jobData.uid, self.gameLogic.currentFanActor.actorNr, self.gameLogic.currentFanActor.gameStatus.fanTimeoutTimes+1);
            self.jobQueue = _.filter(self.jobQueue, function (j) {
                return j.uid != jobData.uid;
            });
            if (jobData.uid == self.gameLogic.currentFanActor.uid) {
                self.fanTimeout(fanTimeoutActor);
            } else {
                logger.debug('game||fan||玩家出牌倒计时发生错误, 当前出牌者和schedule出牌者不同, 当前:%s, schedule:%s', fanTimeoutActor.uid, jobData.uid);
            }

        }, {uid: self.gameLogic.currentFanActor.uid});


        self.jobQueue.push({uid: fanTimeoutActor.uid, jobId: jobId});

    });

}

Game.prototype.fanTimeout = function (actor) {

    var act = _.findWhere(this.actors, {uid: actor.uid});
    var cards = [];

    //出牌超时，如果当前出牌者是本轮Boss，则出第一张，如果不是，则不出
    if (this.gameLogic.currentBoss.actorNr == this.gameLogic.currentFanActor.actorNr) {
        //如果是第一手牌, 那必须出全部5
        if (this.gameLogic.round == 0) {
            _.each(act.gameStatus.getHoldingCards(), function (c) {
                if (c % 100 == 5) {
                    cards.push(c);
                }
            });
        }
        else {
            cards.push(act.gameStatus.getHoldingCards()[act.gameStatus.currentHoldingCards.length - 1]);
        }
    }
    else {
        //如果玩家已托管 - 智能出牌
        if (act.gameStatus.isTrusteeship) {
            cards = CardLogic.simpleAnalysis(this.gameLogic.lastFanCardRecognization, act.gameStatus.currentHoldingCards, this.maxActor, this.gameLogic.appends);
        }
    }


    act.gameStatus.fanTimeoutTimes = act.gameStatus.fanTimeoutTimes + 1;
    //如果玩家连续consts.GAME.TRUSTEESHIP.TIMEOUT_TIMES次出牌超时，则托管
    if (act.gameStatus.fanTimeoutTimes == consts.GAME.TRUSTEESHIP.TIMEOUT_TIMES) {
        logger.debug('game||fanTimeout||玩家[%j]出牌超时次数到达,自动托管, ||用户&ID: %j, actorNr: %j, 超时次数: %j', act.properties.nickName, act.uid, act.actorNr, act.gameStatus.fanTimeoutTimes);
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
        logger.debug('game||fan||出牌错误，非法玩家||用户&ID: %j', data.uid);
        cb({code: Code.FAIL});
        return;
    }

    var cards = data.cards;
    if (!_.isArray(cards) || !!cards == false || !cards) {
        logger.debug('game||fan||出牌错误，非法出牌||用户&ID: %j', data.uid);
        cb({code: Code.FAIL});
        return;
    }

    //如果当前出牌玩家是上轮Boss，并且没有出牌，则非法
    if (this.gameLogic.currentBoss.actorNr == actor.actorNr && cards.length == 0) {
        logger.debug('game||fan||出牌错误，Boss玩家不能不出牌||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.MUST_FAN});
        return;
    }

    //如果当前出牌玩家不是本轮出牌玩家（客户端发送的出牌玩家ID和服务器端状态中当前出牌者ID），则非法
    if (this.gameLogic.currentFanActor.uid !== data.uid) {
        logger.debug('game||fan||出牌错误，此次不轮您出牌||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.FAN_REPEAT});
        return;
    }

    if (this.gameLogic.currentPhase !== consts.GAME.PHASE.FAN) {
        cb({code: Code.FAIL})
        logger.debug('game||fan||出牌错误, 玩家不在游戏中, 可能是网络状况导致客户端在结束状态时仍显示说话操作||用户&ID: %j', data.uid);
        return;
    }

    var isTimeout = data.isTimeout;

    if (!isTimeout) {
        actor.gameStatus.fanTimeoutTimes = 0;
        actor.gameStatus.isTrusteeship = false;
    }

    //玩家不出（传空数组）
    if (cards.length == 0) {

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

        this.gameLogic.round += 1;

        //push message
        this.channel.pushMessage(consts.EVENT.FAN, {
            uid: data.uid,
            actorNr: actor.actorNr,
            cards: cards,
            cardRecognization: null
        }, null, function () {
            self.fanCountdown();
        });

        return;
    }

    //识别牌型
    var cardRecognization = CardLogic.recognizeSeries(cards, this.maxActor, actor.gameStatus.append);
    switch (cardRecognization.cardSeries) {
        case CardLogic.CardSeriesCode.cardSeries_99:
            //错误牌型
            logger.debug('game||fan||出牌错误，错误牌型||用户&ID: %j', data.uid);
            cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.ERR});
            break;
        default:
            //玩家手牌中没有所出牌
            if (!actor.gameStatus.hasCards(cards)) {
                logger.debug('game||fan||出牌错误，玩家没有该牌||用户&ID: %j', data.uid);
                cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.WITHOUT_CARDS});
                return;
            }

            //如果不是Boss出牌，则需比较上手牌
            if (this.gameLogic.currentBoss.actorNr != actor.actorNr) {

                var result = CardLogic.isCurrentBiggerThanLast(cardRecognization, this.gameLogic.lastFanCardRecognization, this.maxActor, this.gameLogic.appends);
                if (_.isUndefined(result)) {
                    if (cards.length == 1 && cards[0] === 116) {
                        loggerErr.debug("%j", {method: "entity.game.fan - !_.isUndefined!", cardRecognization: cardRecognization, lastFanCardRecognization: this.gameLogic.lastFanCardRecognization, maxActor: this.maxActor, appends: this.gameLogic.appends, desc: '玩家出方块3时, 打不了3/4'})
                    }
                    logger.debug('game||fan||出牌错误，玩家出牌是单牌或对子, 与上手牌型不匹配||用户&ID: %j', data.uid);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.ERR});
                    return;
                }
                if (!result) {
                    if (cards.length == 1 && cards[0] === 116) {
                        loggerErr.debug("%j", {method: "entity.game.fan - !result", cardRecognization: cardRecognization, lastFanCardRecognization: this.gameLogic.lastFanCardRecognization, maxActor: this.maxActor, appends: this.gameLogic.appends, desc: '玩家出方块3时, 打不了3/4'})
                    }
                    logger.debug('game||fan||出牌错误，玩家当前出牌小于上手牌||用户&ID: %j', data.uid);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.NOT_BIGGER});
                    return;
                }
            }

            //如果是第一轮-红桃5先出牌，必须包含5的
            if (this.gameLogic.round == 0) {
                if (!_.contains(cards, 205)) {
                    logger.debug('game||fan||出牌错误，首轮出牌必须含红桃5||用户&ID: %j', data.uid);
                    cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.MUST_CONTAINS_HEART5});
                    return;
                }

                //Note: 这个游戏逻辑是错误的..
                //var expectedCards = [];
                //_.each(actor.gameStatus.getHoldingCards(), function (c) {
                //    if (c % 100 == 5) {
                //        expectedCards.push(c);
                //    }
                //});
                //var diffCards = _.difference(expectedCards, cards);
                //if (_.size(diffCards) != 0) {
                //    logger.debug('game||fan||出牌错误，红桃5第一次出牌必须出全部5||用户&ID: %j', data.uid);
                //    cb({code: Code.FAIL, err: consts.ERR_CODE.FAN.MUST_BE_FIVE});
                //    return;
                //}
            }

            //设置玩家相关属性
            actor.gameStatus.fanCards(cards);
            
            //设置全局牌记录
            this.gameLogic.removeOriginalCards(cards);

            //设置游戏逻辑相关
            this.gameLogic.lastFanActor = actor;
            this.gameLogic.lastFanCards = cards;
            this.gameLogic.lastFanCardRecognization = cardRecognization;

            this.gameLogic.round += 1;

            cb({code: Code.OK, cards: cards, cardRecognization: cardRecognization});

            var job = _.findWhere(this.jobQueue, {uid: data.uid});
            //出牌成功, 取消fanCountdown schedule
            if (!!job) {
                schedule.cancelJob(job.jobId);
                this.jobQueue = _.filter(this.jobQueue, function (j) {
                    return j.jobId != job.jobId;
                });
            }

            this.channel.pushMessage(consts.EVENT.FAN, {
                uid: data.uid,
                actorNr: actor.actorNr,
                cards: cards,
                cardRecognization: cardRecognization
            }, null, function () {

                //如果是接风环节，此次出牌代表有人接了，reset接风设置
                if (self.gameLogic.isGiveLogic) {
                    self.gameLogic.isGiveLogic = false;
                    self.gameLogic.giveLogicFanRound = 0;
                    self.gameLogic.lastFanOverNextCountdownActor = null;
                }

                //如果玩家出的牌型是黑3，并且玩家身份是红3并且没有亮而且在手牌中，则需通知牌局中其他玩家：我有3呢
                if (self.maxActor == consts.GAME.TYPE.FIVE) {
                    //如果5人局里，当前出牌是单牌并且是♠️3或者♣️3，如果是对子并且是♠️3和♣️3，
                    if ((_.size(cards) == 1 && _.contains([316, 416], cards[0])) || (_.size(cards) == 2 && _.size(_.difference([316, 416], cards)) == 0)) {
                        //如果玩家手牌中有红3并且没有亮并且之前没有出过红3，则不能骗人，出黑3时需要通知牌局其他玩家身份
                        if ((actor.gameStatus.hasCards([116]) || actor.gameStatus.hasCards([216]))
                            && ((!_.contains(actor.gameStatus.outCards, 116) && !_.contains(actor.gameStatus.outCards, 216)))) {
                            if (_.size(actor.gameStatus.append) == 0) {
                                logger.debug('game||fan||3家没有亮3,先出黑3,为防止骗人,通知他人||用户&ID: %j', data.uid);
                                self.channel.pushMessage(consts.EVENT.FAN_WHEN_IS_RED, gameResponse.generateActorPoorResponse(actor), null, null);
                            }
                        }
                    }
                }
                else {
                    //如果6,7人局里，当前出牌是单牌并且是♣️3，如果玩家手牌中有红3并且没有亮，则不能骗人，出黑3时需要通知牌局其他玩家身份
                    if (_.size(cards) == 1 && _.size(_.difference([416], cards)) == 0) {
                        if ((actor.gameStatus.hasCards([116]) || actor.gameStatus.hasCards([216]) || actor.gameStatus.hasCards([316]))
                            && ((!_.contains(actor.gameStatus.outCards, 116) && !_.contains(actor.gameStatus.outCards, 216) && !_.contains(actor.gameStatus.outCards, 316)))) {
                            if (_.size(actor.gameStatus.append) == 0) {
                                logger.debug('game||fan||3家没有亮3,先出黑3,为防止骗人,通知他人||用户&ID: %j', data.uid);
                                self.channel.pushMessage(consts.EVENT.FAN_WHEN_IS_RED, gameResponse.generateActorPoorResponse(actor), null, null);
                            }
                        }
                    }
                }

                //判断是否已结束
                if (actor.gameStatus.getHoldingCards().length == 0) {

                    //设置当前玩家出牌结束，并设置gameLogic中3家和股家的完成情况
                    var identity = consts.GAME.IDENTITY.HONG3;
                    var actorIdentity = _.findWhere(self.gameLogic.red, {uid: actor.uid});
                    if (_.isUndefined(actorIdentity)) {
                        identity = consts.GAME.IDENTITY.GUZI;
                        actorIdentity = _.findWhere(self.gameLogic.black, {uid: actor.uid});
                    }
                    actorIdentity.isFinished = true;

                    //所有玩家出牌完成状态
                    var actorStatusCount = _.countBy(_.flatten([self.gameLogic.red, self.gameLogic.black]), function (actorStatus) {
                        return actorStatus.isFinished == true ? 'finished' : 'notFinished'
                    });

                    //大油:第一个出完牌的玩家
                    if (actorStatusCount.finished == 1) {
                        self.bigActorWithLastGame = {
                            uid: actorIdentity.uid,
                            actorNr: actorIdentity.actorNr,
                            identity: identity
                        };
                    }

                    actor.gameStatus.rank = actorStatusCount.finished;

                    //如果玩家出完手牌，向牌桌玩家发送消息
                    self.channel.pushMessage(consts.EVENT.FAN_FINISHED, {
                        actor: {
                            uid: actor.uid,
                            actorNr: actor.actorNr,
                            rank: actor.gameStatus.rank,
                            identity: identity
                        }
                    }, null, function () {
                        //判断牌局是否结束
                        if (self.isOver()) {
                            self.over();
                            return;
                        }

                        self.gameLogic.isGiveLogic = true;
                        self.gameLogic.giveLogicFanRound = 0;
                        //刚跑了的玩家(出完所有手牌), 根据此值获得接风玩家, 并把该变量赋值为接风玩家
                        self.gameLogic.lastFanOverNextCountdownActor = actor;


                        var nextFanActor = self.gameLogic.getNextActor(self.gameLogic.lastFanOverNextCountdownActor);
                        while (true) {
                            if (nextFanActor.gameStatus.getHoldingCards().length > 0) {
                                //设置下家出牌者，如果下家已出完牌，找下下家，以此类推；针对接风环节
                                self.gameLogic.lastFanOverNextCountdownActor = nextFanActor;
                                ////设置下家出牌者，如果下家已出完牌，找下下家，以此类推
                                self.gameLogic.currentFanActor = nextFanActor;
                                break;
                            }
                            nextFanActor = self.gameLogic.getNextActor(nextFanActor);
                        }

                        self.fanCountdown()

                    });

                }
                else {
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
                }

            });

    }

}

Game.prototype.isOver = function () {
    var isOver = false;
    var notFinishedByRed = _.findWhere(this.gameLogic.red, {isFinished: false});
    var notFinishedByBlack = _.findWhere(this.gameLogic.black, {isFinished: false});

    //如果红3都出完了，并且大油是红3，则结束，红3胜利
    if (_.isUndefined(notFinishedByRed) && this.bigActorWithLastGame.identity == consts.GAME.IDENTITY.HONG3) {
        this.gameLogic.result = consts.GAME.RESULT.RED_WIN;
        isOver = true;
    }
    //如果股子都出完了，并且大油是股子，则结束，股子胜利
    else if (_.isUndefined(notFinishedByBlack) && this.bigActorWithLastGame.identity == consts.GAME.IDENTITY.GUZI) {
        this.gameLogic.result = consts.GAME.RESULT.BLACK_WIN;
        isOver = true;
    }
    //如果红3都出完了，并且大油是股子，则结束，平局
    else if (_.isUndefined(notFinishedByRed) && this.bigActorWithLastGame.identity == consts.GAME.IDENTITY.GUZI) {
        this.gameLogic.result = consts.GAME.RESULT.TIE;
        isOver = true;
    }
    //如果股子都出完了，并且大油是红3，则结束，平局
    else if (_.isUndefined(notFinishedByBlack) && this.bigActorWithLastGame.identity == consts.GAME.IDENTITY.HONG3) {
        this.gameLogic.result = consts.GAME.RESULT.TIE;
        isOver = true;
    }


    return isOver;
}

Game.prototype.over = function () {
    this.gameLogic.currentPhase = consts.GAME.PHASE.OVER;
    this.nobodyTalkTime = 0;

    //玩家剩余牌
    var remainingCardsOfActors = [];
    _.each(this.actors, function (act) {
        remainingCardsOfActors.push({actorNr: act.actorNr, remainingCards: act.gameStatus.getHoldingCards()})
    });

    var self = this;
    balanceService.balance(this, function (data) {
        logger.debug('游戏结束||%j||向客户端发送游戏结束消息', self.gameId);
        self.channel.pushMessage(consts.EVENT.OVER, {
            game: {result: self.gameLogic.result, share: self.gameLogic.share},
            details: data.details,
            remainingCardsOfActors: remainingCardsOfActors
        }, null, function () {
            _.map(self.actors, function (actor) {
                actor.isReady = false;
                self.scheduleNotReady({uid: actor.uid});
            })
        });

    });

}

/**
 * 5人局双三认输
 * @param data: {uid: String}
 */
Game.prototype.giveUp = function (data) {
    //如果不是5人局,则不处理
    if (this.maxActor !== 5) return;
    //如果玩家手牌没有方块3和红桃3, 则不处理
    var actor = _.findWhere(this.actors, {uid: data.uid});
    var cards = actor.gameStatus.getHoldingCards();
    if (!(_.contains(cards, 116) && _.contains(cards, 216))) return;

    var self = this;
    //认输,取消所有schedule
    _.each(this.jobQueue, function (job) {
        if (!!job) {
            schedule.cancelJob(job.jobId);
            self.jobQueue = _.filter(self.jobQueue, function (j) {
                return j.jobId != job.jobId;
            });
        }
    });

    //认输, 标识股子赢, 本局为一股子(即如果是100底注则认输是每人拿100, 如果是1000底则每人拿1000)
    this.gameLogic.result = consts.GAME.RESULT.BLACK_WIN;
    this.gameLogic.share = 1;
    this.gameLogic.isGiveUp = true;
    this.over();
}

/**
 * 托管
 * @param data
 * @param cb
 */
Game.prototype.trusteeship = function (data, cb) {
    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor || actor == undefined) {
        logger.debug('game-trusteeship||%j||托管失败, 玩家不在牌桌中||用户&ID: %j', data.uid, data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.NOT_IN_GAME})
        return;
    }
    if (this.gameLogic == null) {
        logger.debug('game-trusteeship||%j||托管失败, 游戏未开始||用户&ID: %j', data.uid, data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.NOT_GAMING})
        return;
    }
    if (this.gameLogic.currentPhase != consts.GAME.PHASE.FAN) {
        logger.debug('game-trusteeship||%j||托管失败, 游戏未开始或已结束||用户&ID: %j', data.uid, data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.NOT_GAMING})
        return;
    }
    if (actor.gameStatus.isTrusteeship) {
        logger.debug('game-trusteeship||%j||玩家已托管||用户&ID: %j', data.uid, data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.ALREADY_TRUSTEESHIP})
        return;
    }

    //设置托管状态为true
    actor.gameStatus.isTrusteeship = true;

    //如果当前不是托管玩家出牌，则直接发托管消息，返回即可
    if (this.gameLogic.currentFanActor.uid != actor.uid) {
        //push 托管消息
        this.channel.pushMessage(consts.EVENT.TRUSTEESHIP, gameResponse.generateActorPoorResponse(actor), null, null);
        cb({code: Code.OK});
        return;
    }

    logger.debug('game-trusteeship||%j||玩家[%j]主动请求托管, ||actorNr: %j', actor.uid, actor.properties.nickName, actor.actorNr);

    //设置玩家超时出牌N次, 为超时出牌逻辑代码通用
    actor.gameStatus.fanTimeoutTimes = consts.GAME.TRUSTEESHIP.TIMEOUT_TIMES - 1;
    this.fanTimeout(actor);
    cb({code: Code.OK});

}

/**
 * 取消托管
 * @param data
 * @param cb
 */
Game.prototype.cancelTrusteeship = function (data, cb) {
    var actor = _.findWhere(this.actors, {uid: data.uid});
    if (!actor || actor == undefined) {
        logger.debug('game-cancelTrusteeship||%j||取消托管失败, 玩家不在牌桌中||用户&ID: %j', data.uid, data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.NOT_IN_GAME})
        return;
    }
    if (this.gameLogic == null) {
        logger.debug('game-trusteeship||%j||托管失败, 玩家还未开始游戏||用户&ID: %j', data.uid, data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.NOT_GAMING})
        return;
    }
    if (this.gameLogic.currentPhase != consts.GAME.PHASE.FAN) {
        logger.debug('game-trusteeship||%j||托管失败, 玩家还未开始游戏||用户&ID: %j', data.uid, data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.NOT_GAMING})
        return;
    }
    if (!actor.gameStatus.isTrusteeship) {
        logger.debug('game||cancelTrusteeship||玩家没有托管||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.TRUSTEESHIP.ALREADY_CANCELED_TRUSTEESHIP})
        return;
    }
    //设置托管状态为false
    actor.gameStatus.isTrusteeship = false;
    actor.gameStatus.fanTimeoutTimes = 0;
    //push 托管消息
    this.channel.pushMessage(consts.EVENT.CANCEL_TRUSTEESHIP, gameResponse.generateActorPoorResponse(actor), null, null);
    cb({code: Code.OK});
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
        logger.debug('game-leave||%j||离开游戏失败, 玩家不在牌桌中||用户&ID: %j', data.uid, data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.LEAVE.NOT_IN_GAME})
        return;
    }

    if (this.gameLogic != null && this.gameLogic.currentPhase != consts.GAME.PHASE.OVER) {
        logger.debug('game-leave||%j||离开游戏失败, 玩家在游戏中||用户&ID: %j', data.uid, data.uid);
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
    actor = null;

    logger.debug('game-leave||%j||离开游戏成功||用户&ID: %j', data.uid, data.uid);

    this.currentActorNum = this.currentActorNum - 1;
    this.isAllReady = false;
    this.isFull = false;

    //如果房间没人
    if (this.currentActorNum == 0) {
        //如果是私人桌, 没人就移除缓存房间;
        if (this.roomId === 45) {
            gameService.removeGameById(this.gameId);
        }
    }

    pomelo.app.rpc.manager.userRemote.onUserLeave(null, data.uid, function () {
        cb({code: Code.OK});
    });


}

Game.prototype.scheduleNotReady = function (data) {
    var self = this;
    //如果玩家加入牌桌[?]秒内没准备则自动离开
    var jobId = schedule.scheduleJob({start: Date.now() + consts.GAME.TIMER.NOT_READY * 1000}, function (jobData) {
        logger.debug('game-ready||%j||玩家加入游戏后[%j]秒内未准备, 强制离开游戏, ||用户&ID: %j', data.uid, consts.GAME.TIMER.NOT_READY, jobData.uid);
        self.jobQueue = _.filter(self.jobQueue, function (j) {
            return j.uid != jobData.uid;
        });
        self.leave({uid: jobData.uid}, function (result) {
        });
    }, {uid: data.uid});

    this.jobQueue.push({uid: data.uid, jobId: jobId});
}

Game.prototype.chat = function (data, cb) {
    /*
     switch (data.type) {
     case consts.CHAT_IN_GAME_TYPE.QUICK:

     break;
     case consts.CHAT_IN_GAME_TYPE.EXPRESSION:
     break;
     case consts.CHAT_IN_GAME_TYPE.CUSTOM:
     break;
     default:
     break;
     }
     */

    var actor = _.findWhere(this.actors, {uid: data.uid});
    this.channel.pushMessage(consts.EVENT.CHAT, {
        uid: data.uid,
        actorNr: actor.actorNr,
        type: data.type,
        item: data.item,
        content: data.content
    }, null, null);

    cb();
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
        loggerErr.debug('%j', {method: "entity.game.join", uid: data.uid, desc: '加入房间时, 房间已满.'});
        return false;
    }

    //如果玩家已加入
    var actorExist = _.findWhere(this.actors, {uid: data.uid});
    if (actorExist && actorExist != undefined) {
        logger.debug("###doAddActor 2 -> ", this.actors, actorExist);
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
        loggerErr.debug('%j', {method: "entity.game.join", uid: data.uid, desc: '加入房间时, this.channel为null 怪异问题.'});
        return false;
    }
    if (data) {
        this.channel.add(data.uid, data.sid);
        return true;
    }
    loggerErr.debug('%j', {method: "entity.game.join", uid: data.uid, data: data, desc: '加入房间时, 参数data为null, 怪异问题.'});
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
var _ = require('lodash');
var consts = require('../../consts/consts');
var sorter = require('./cardSorter');
var logger = require('log4js').getLogger(consts.LOG.GAME);
var loggerErr = require('log4js').getLogger(consts.LOG.ERROR);


var GameLogic = function (game) {
    logger.debug("game||start||初始化游戏逻辑,游戏ID:[%j]", game.gameId);
    this.game = game; //game
    this.cards = [];    //牌: 初始化牌->洗牌->发牌, 最后为空数组
    this.originalCards = []; //全局牌

    //玩家真实身份
    this.red = [];  //3家 {uid:xx, actorNr:xx, isFinished: true/false}
    this.black = [];    //股家 {uid:xx, actorNr:xx, isFinished: true/false}

    this.currentPhase = null;

    this.round = 0;

    this.currentBoss = null;    //本回合Boss
    this.currentFanActor = null;

    this.lastFanCards = null;
    this.lastFanActor = null;
    this.lastFanCardRecognization = null;

    this.hasTalk = false;

    this.currentTalker = null;    //当前说话的
    this.firstFanActor = null;    //第一个出牌的
    this.talkNumber = 0;
    this.talkTimeoutNumber = 0; //说话超时次数

    this.appends = [];  //牌局亮3情况

    this.share = 0;  //基数（每个人亮3数或股子数）
    this.result = null;  //结局


    this.isGiveLogic = false;    //是否是接风环节
    this.giveLogicFanRound = 0;
    this.lastFanOverNextCountdownActor = null;  //第一个接风玩家

    this.isGiveUp = false;  //是否是五人局认输情况

    this.init();

}

GameLogic.prototype.init = function () {

    this.cards = this.initialCards();
    this.cards = this.shuffleCards();
    //记录全局牌
    this.originalCards = sorter.sort(this.initialCards());
    this.currentPhase = consts.GAME.PHASE.STARTING;
}

GameLogic.prototype.reset = function () {

}

GameLogic.prototype.newGame = function () {
    try {
        logger.debug("game||start||游戏即将开始,游戏ID:[%j]", this.game.gameId);

        var firstGetPokerActorNr;
        //如果当前牌局玩家和上局玩家一样，则先发牌的是上局大油
        if (this.game.bigActorWithLastGame != null) {
            firstGetPokerActorNr = this.game.bigActorWithLastGame.actorNr;
        }
        else {
            firstGetPokerActorNr = this.randomFirstActor();
        }

        var actor = _.findWhere(this.game.actors, {actorNr: firstGetPokerActorNr});

        //发牌
        this.deal(actor);

        //计算谁先说话
        if (this.game.bigActorWithLastGame != null) {
            this.currentTalker = this.game.bigActorWithLastGame
        }
        else {
            this.currentTalker = this.getHeartAActor();
        }

        var heart5Actor = this.getHeart5Actor();
        this.firstFanActor = {uid: heart5Actor.uid, actorNr: heart5Actor.actorNr};

        this.currentPhase = consts.GAME.PHASE.TALKING;

    } catch (err) {
        loggerErr.error('%j', {gameId: this.game.gameId, type: consts.LOG.CONF.GAME.TYPE, action: consts.LOG.CONF.GAME.START,
            message: '游戏开始失败'+err.toString(), createdAt: new Date()});
    }

}

/**
 * 发牌
 * @param actor 第一个抓牌玩家
 */
GameLogic.prototype.deal = function (actor) {
    while (this.cards.length > 0) {
        actor.gameStatus.addHoldingCards([_.first(this.cards)]);
        this.cards = _.rest(this.cards);
        actor = this.getNextActor(actor);
    }
}

//test deal... 5人
// GameLogic.prototype.deal = function (actor) {
//    var cards1 = [105,205,305,405,107,207,307,407,108,208],
//        cards2 = [109,209,309,409,110,210,310,410,308,408],
//        cards3 = [111,211,311,411,112,212,312,412,113,213],
//        cards4 = [114,214,314,414,115,215,315,415,313,413],
//        cards5 = [116,216,316,416,117,217,317,417,18,19];

//    actor.gameStatus.addHoldingCards(cards1);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards2);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards3);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards4);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards5);
// }

//test deal... 6人
// GameLogic.prototype.deal = function (actor) {
//    var cards1 = [105,205,305,405,107,207,307,407,108],
//        cards2 = [109,209,309,409,110,210,310,410,308],
//        cards3 = [111,211,311,411,112,212,312,412,113],
//        cards4 = [114,214,314,414,115,215,315,415,313],
//        cards5 = [116,216,316,416,117,217,317,417,18],
//        cards6 = [106,206,306,406,208,408,213,413,19];

//    actor.gameStatus.addHoldingCards(cards1);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards2);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards3);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards4);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards5);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards6);
// }

//test deal... 7人
// GameLogic.prototype.deal = function (actor) {
//    var cards1 = [105,205,305,405,107,207,307,407],
//        cards2 = [109,209,309,409,110,210,310,410],
//        cards3 = [111,211,311,411,112,212,312,412],
//        cards4 = [114,214,314,414,115,215,315,415],
//        cards5 = [116,216,316,416,117,217,317,417],
//        cards6 = [106,206,306,406,208,408,213,413],
//        cards7 = [108,308,113,313,18,408,19];

//    actor.gameStatus.addHoldingCards(cards1);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards2);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards3);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards4);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards5);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards6);
//    actor = this.getNextActor(actor);
//    actor.gameStatus.addHoldingCards(cards7);
// }


GameLogic.prototype.cardsSort = function (actors) {
    _.map(actors, function (actor) {
        actor.gameStatus.setHoldingCards(sorter.sort(actor.gameStatus.getHoldingCards()));
    })
}

/**
 * 随机获得抓牌的第一个玩家的座位编号
 */
GameLogic.prototype.randomFirstActor = function () {
    return _.random(1, this.game.maxActor);
}

GameLogic.prototype.getHeartAActor = function () {
    var heartA = [214]; //红桃A
    for (var i = 0; i < this.game.actors.length; i++) {
        if (this.game.actors[i].gameStatus.hasCards(heartA)) {
            return this.game.actors[i];
        }
    }

}

GameLogic.prototype.getHeart5Actor = function () {
    var heart5 = [205]; //红桃5
    for (var i = 0; i < this.game.actors.length; i++) {
        if (this.game.actors[i].gameStatus.hasCards(heart5)) {
            return this.game.actors[i];
        }
    }
}


//牌面编号从5开始到4结束 5 6 7 8 9 10 J Q K A 2 3 4，最后是4，取值17
//大小鬼分别为19,18，其它牌编号为三位数字，第一位数字代表花色
//1,红方片
//2,红心
//3,黑桃
//4,黑梅花
//如105代表方片5,

//产生扑克牌数组
GameLogic.prototype.initialCards = function () {
    var result = [];

    result[0] = 18; //小王
    result[1] = 19; //大王
    var k = 0;
    for (var i = 0; i < 4; i++) {
        var j = 0;
        for (j = 0; j < 13; j++) {
            result[k + j + 2] = (i + 1) * 100 + (j + 5);
        }
        k = k + j;
    }
    //如果是5人局，移除各种6；
    if (this.game.maxActor == consts.GAME.TYPE.FIVE) {
        result = _.without(result, 106, 206, 306, 406);
    }
    return result;
}

GameLogic.prototype.shuffleCards = function () {
    return _.shuffle(this.cards);
}

GameLogic.prototype.getNextActor = function (actor) {
    if (actor.actorNr == this.game.maxActor) {
        return _.findWhere(this.game.actors, {actorNr: 1});
    }
    else {
        return _.findWhere(this.game.actors, {actorNr: actor.actorNr + 1})
    }
}

/**
 * 在全局牌记录中移除已出的牌
 * @param cards
 */
GameLogic.prototype.removeOriginalCards = function(cards)
{
    for (var v in cards)
    {
        this.originalCards = _.without(this.originalCards, cards[v]);
    }
}



module.exports = GameLogic;
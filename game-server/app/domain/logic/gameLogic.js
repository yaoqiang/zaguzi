var _ = require('underscore');
var consts = require('../../consts/consts');
var sorter = require('./cardSorter');
var logger = require('pomelo-logger').getLogger(consts.LOG.GAME);

var GamePhase = {
    Starting: 0,
    Talking: 1,
    Fan: 2,
    Finished: 3
}

var GameLogic = function (game) {
    logger.log("game||start||游戏即将开始..");
    this.game = game; //game
    this.cards = [];    //牌

    this.currentPhase = null;

    this.currentBoss = null;    //本回合Boss
    this.currentRound = 0;

    this.lastFanOutCards = [];
    this.lastFanOutActor = null;
    this.lastFanOutCardRecognization = null;

    this.hasTalk = false;

    this.currentTalker = null;    //第一个说话的
    this.firstFanActor = null;    //第一个出牌的
    this.talkNumber = 0;

    this.base = 0;  //基数（每个人亮3数或股子数）

}

GameLogic.prototype.constructor = function () {

    this.cards = this.initialCards();
    this.cards = this.shuffleCards();
    this.currentPhase = GamePhase.Starting;
}

GameLogic.prototype.reset = function () {

}

GameLogic.prototype.newGame = function () {
    try {

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
            this.currentTalker = this.getRedAActor();
        }

        var redAActor = this.getRed5Actor();
        this.firstFanActor = {uid: redAActor.uid, actorNr: redAActor.actorNr};

        this.currentPhase = GamePhase.Talking;

    } catch (e) {
        logger.error('game||start||游戏开始异常:%j', e);
    }

}

/**
 * 发牌
 * @param actor 第一个抓牌玩家
 */
GameLogic.prototype.deal = function (actor) {
    while (this.cards.length > 0) {
        actor.gameStatus.addHoldingCards(_.rest(this.cards));
        actor = this.getNextActor(actor);
    }
}

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

GameLogic.prototype.getRedAActor = function () {
    var redA = 214; //红桃A
    return _.map(this.game.actors, function (actor) {
        if (actor.gameStatus.hasCards(redA)) {
            return actor;
        }
    });
}

GameLogic.prototype.getRed5Actor = function () {
    var redA = 205; //红桃5
    return _.map(this.game.actors, function (actor) {
        if (actor.gameStatus.hasCards(redA)) {
            return actor;
        }
    });
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


module.exports = GameLogic;
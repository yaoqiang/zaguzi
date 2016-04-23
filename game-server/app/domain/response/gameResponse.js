var _ = require('lodash');

var gameUtil = require('../../util/gameUtil');

var exp = module.exports;

exp.generateActorsResponse = function (actors) {
    var result = [];
    _.map(actors, function (actor) {
        result.push(exp.generateActorResponse(actor));
    });
    return result;
}

/**
 * 干净的actor结果，with gameStatus, 没有连带properties（物品、任务等player属性）
 * @param actor
 * @param useNoteCard {Boolean} 是否生成带记牌器的Response
 */
exp.generateActorRichResponse = function (actor, useNoteCard, originalCards) {
    var act = this.generateActorResponse(actor);
    if (useNoteCard) {
        //如果玩家有记牌器, 才添加剩余牌属性
        if (gameUtil.isItemExistAndNotExpired(actor.properties.items, {id: 3})) {
            act.remainingCards = gameUtil.calculateRemainingCards(originalCards, actor.gameStatus.currentHoldingCards);
        }
    }
    act.gameStatus = {
        currentHoldingCards: actor.gameStatus.currentHoldingCards,
        outCards: actor.gameStatus.outCards,
        isTrusteeship: actor.gameStatus.isTrusteeship,
        //isLastFanTimeout: actor.gameStatus.isLastFanTimeout,
        identity: actor.gameStatus.identity,
        append: actor.gameStatus.append
    }
    return act;
}

exp.generateActorPoorResponse = function (actor) {
    return {
        actor: {
            uid: actor.uid,
            actorNr: actor.actorNr
        }
    }
}

exp.generateActorPoorResponseWithSecond = function (actor, second) {
    return {
        actor: {
            uid: actor.uid,
            actorNr: actor.actorNr
        },
        second: second
    }
}

exp.generateActorResponse = function (actor) {
    return {
        isReady: actor.isReady,
        actorNr: actor.actorNr,
        uid: actor.uid,
        sid: actor.sid,
        properties: {
            nickName: actor.properties.nickName,
            avatar: actor.properties.avatar,
            gender: actor.properties.gender,
            gold: actor.properties.gold,
            winNr: actor.properties.winNr,
            loseNr: actor.properties.loseNr,
            rank: actor.properties.rank,
            fragment: actor.properties.fragment
        }
    }
}


exp.ready = {}

exp.leave = {}

exp.start = {}

exp.talking = {}

exp.talk = {}

exp.fan = {}

exp.over = {}
var _ = require('underscore');

var exp = module.exports;

exp.generateActorsResponse = function (actors) {
    var result = [];
    _.map(actors, function (actor) {
        result.push(exp.generateActorResponse(actor));
    });
    return result;
}

exp.generateActorRichResponse = function (actor) {
    var act = this.generateActorResponse(actor);
    act.gameStatus = {
        currentHoldingCards: actor.gameStatus.currentHoldingCards,
        outCards: actor.gameStatus.outCards,
        //isTrusteeship: actor.gameStatus.isTrusteeship,
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
        actor: {
            isReady: actor.isReady,
            actorNr: actor.actorNr,
            uid: actor.uid,
            sid: actor.sid,
            properties: {
                nickName: actor.properties.nickName,
                avatar: actor.properties.avatar,
                gold: actor.properties.gold,
                winNr: actor.properties.winNr,
                loseNr: actor.properties.loseNr,
                rank: actor.properties.rank,
                fragment: actor.properties.fragment
            }
        }
    }
}


exp.ready = {

}

exp.leave = {

}

exp.start = {

}

exp.talking = {

}

exp.talk = {

}

exp.fan = {

}

exp.over = {

}
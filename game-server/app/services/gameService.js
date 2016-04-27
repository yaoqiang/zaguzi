/**
 * Module dependencies
 */
var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var Code = require('../../../shared/code');

var logger = require('log4js').getLogger(consts.LOG.GAME);

var Game = require('../domain/entity/game');
var gameResponse = require('../domain/response/gameResponse');

var gameUtil = require('../util/gameUtil');

var gameService = module.exports;

//variables
var gGameId = 0;
var gGameList = [];



gameService.join = function(data, cb)
{
    //检查金币是否可加入
    var goldValidator = gameUtil.getJoinAvailable(data.roomId, data.player);
    if (goldValidator.code == Code.FAIL) {
        cb(goldValidator);
        return;
    }

    //优先查找缺1人的牌局, 如果没有则直接加入第一个有空位的牌局
    var emptyGame = (function(gGameList) {
        var priorityGameList = _.filter(gGameList, function(g) {
            return g.currentActorNum === g.maxActor - 1 && g.roomId === data.roomId;
        });

        if (priorityGameList.length > 0) {
            return _.first(priorityGameList);
        }
        return _.findWhere(gGameList, {roomId: data.roomId, isFull: false});
    })(gGameList);
    
    //如果没有空闲牌局,则创建牌局
    var game;
    if (!_.isUndefined(emptyGame))
    {
        game = this.getGameById(emptyGame.gameId);
        if (_.isUndefined(game))
        {
            cb({code: Code.FAIL, gameId: undefined});
            return;
        }
    }
    else
    {
        game = new Game(data.roomId, ++gGameId);
        gGameList.push(game);
    }

    game.join(data, function (result) {
        if (result.code === Code.OK)
        {
            cb({code: Code.OK, lobbyId: game.lobbyId, roomId: data.roomId, gameId: game.gameId, gameType: game.maxActor, base: game.base, actors: result.actors});
            return;
        }
        cb({code: Code.FAIL});
    });
}

gameService.leave = function (data, cb) {
    var game = gameService.getGameById(data.gameId);
    //如果游戏状态不是 未开始或已结束，玩家不可以离开牌桌
    if (game.gameLogic != null && game.gameLogic.currentPhase != consts.GAME.PHASE.OVER) {
        logger.debug('game||leave||离开游戏失败, 游戏正在进行中||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.LEAVE.GAMING});
        return;
    }

    game.leave({uid: data.uid}, function (result) {
        if (result.code == Code.FAIL) {
            logger.debug('game||leave||离开游戏失败||用户&ID: %j', data.uid);
            cb(result);
            return;
        }
        cb(result);

        //如果房间没人
        if (game.currentActorNum == 0) {

        }
    });
}


gameService.ready = function(data, cb)
{
    //检查金币是否可准备继续游戏
    var goldValidator = gameUtil.getJoinAvailable(data.roomId, data.player);
    if (goldValidator.code == Code.FAIL) {
        cb(goldValidator);
        return;
    }
    var game = this.getGameById(data.gameId);
    //如果玩家已准备，则返回已准备
    var actor = _.findWhere(game.actors, {uid: data.uid});
    if (actor.isReady) {
        logger.debug('game||leave||准备失败, 玩家已准备||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.READY.ALREADY_READY});
        return;
    }
    game.ready(data, cb);
}

gameService.talk = function(data, cb)
{
    var game = this.getGameById(data.gameId);

    game.talk(data, cb);
}

gameService.fan = function (data, cb) {
    var game = this.getGameById(data.gameId);
    game.fan(data, cb);
}

gameService.trusteeship = function (data, cb) {
    this.getGameById(data.gameId).trusteeship(data, cb)
}

gameService.cancelTrusteeship = function (data, cb) {
    this.getGameById(data.gameId).cancelTrusteeship(data, cb)
}

gameService.chat = function (data, cb) {
    var game = this.getGameById(data.gameId);
    game.chat(data, cb);
}

gameService.kick = function()
{

}

/**
 * 通过游戏ID获得当前游戏状态明细信息
 * @param data {uid: xx, gameId: xx}
 */
gameService.getGameStatusDetailsById = function(data, cb)
{
    var game = this.getGameById(data.gameId)
    // 当前游戏信息结构
    // {
    // game: {base: 100},
    // actors: [
    // {uid: 0, actorNr: 1, nickName: '', avatar: 1, identity: consts.GAME.IDENTITY, append: [116,216,316,416], rank: 0, isTrusteeship: false, holdingCards: []},
    // {}],
    // selfUid: 自己id
    // gameLogic: {
    // currentPhase: consts.GAME.PHASE,
    // currentFanActor: {uid: 0, actorNr: 1},
    // lastFanActor: {uid: 0, actorNr: 1},
    // lastFanCardRecognization: CardRecognization,
    // currentTalker: {uid: 0, actorNr: 1},
    // share: 0
    // }

    var actors = _.map(game.actors, function(actor) {
        return _.assign(gameResponse.generateActorResponse(actor), {
            identity: actor.gameStatus.identity, append: actor.gameStatus.append,
            rank: actor.gameStatus.rank, isTrusteeship: actor.gameStatus.isTrusteeship,
            currentHoldingCards: actor.uid == data.uid ? actor.gameStatus.currentHoldingCards : [],
            remainingCards: (function (actor, game) {
                if (actor.uid !== data.uid) return null;
                //如果房间可以使用记牌器
                if (game.useNoteCard) {
                    //如果玩家有记牌器, 才添加剩余牌属性
                    if (gameUtil.isItemExistAndNotExpired(actor.properties.items, {id: 3})) {
                        return gameUtil.calculateRemainingCards(game.gameLogic.originalCards, actor.gameStatus.currentHoldingCards);
                    }
                    return null;
                }
                return null;
            })(actor, game)
        })
    });

    cb({
        game: {lobbyId: game.lobbyId, roomId: game.roomId, gameId: game.gameId, gameType: game.maxActor, base: game.base},
        actors: actors,
        gameLogic: {
            isBoss: (function () {
                if (game.gameLogic.currentPhase === consts.GAME.PHASE.FAN) {
                    return game.gameLogic.currentBoss.uid === game.gameLogic.currentFanActor.uid
                }
                return false;
            })(),
            currentPhase: game.gameLogic.currentPhase,
            currentFanActor: game.gameLogic.currentPhase != consts.GAME.PHASE.FAN ? {} : {uid: game.gameLogic.currentFanActor.uid, actorNr: game.gameLogic.currentFanActor.actorNr},
            lastFanActor: game.gameLogic.currentPhase != consts.GAME.PHASE.FAN ? {} : {uid: game.gameLogic.lastFanActor.uid, actorNr: game.gameLogic.lastFanActor.actorNr},
            lastFanCardRecognization: game.gameLogic.currentPhase != consts.GAME.PHASE.FAN ? null : game.gameLogic.lastFanCardRecognization,
            currentTalker: game.gameLogic.currentPhase != consts.GAME.PHASE.TALKING ? {} : {uid: game.gameLogic.currentTalker.uid, actorNr: game.gameLogic.currentTalker.actorNr},
            share: game.gameLogic.share
        }});

}


gameService.getGameById = function(gameId)
{
    return _.findWhere(gGameList, {gameId: gameId});
}

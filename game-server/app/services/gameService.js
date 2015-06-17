/**
 * Module dependencies
 */
var Game = require('../domain/entity/game');
var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.GAME);
var pomelo = require('pomelo');

var Code = require('../../../shared/code');
var _ = require('underscore');


var exp = module.exports;

//variables
var gGameId = 0;
var gGameList = [];



exp.join = function(data, cb)
{
    //根据加入场次查找空闲牌局
    var emptyGame = _.findWhere(gGameList, {roomId: data.roomId, isFull: false});
    //如果没有空闲牌局,则创建牌局
    var game;
    if (!emptyGame)
    {
        game = new Game(data.roomId, ++gGameId);
        gGameList.push({roomId: data.roomId, gameId: game.gameId, game: game, isFull: false});
    }
    else
    {
        game = this.getGameById(emptyGame.gameId);
        if (!game)
        {
            cb({code: Code.FAIL, gameId: undefined});
            return;
        }

    }
    game.join(data, function (result) {
        if (result.code === Code.OK)
        {
            cb({code: Code.OK, lobbyId: game.lobbyId, gameId: game.gameId, base: game.base, actors: result.actors});
            return;
        }
        cb({code: Code.FAIL});
    });



}


exp.ready = function(data, cb)
{
    var game = this.getGameById(data.gameId);
    //如果玩家已准备，则返回已准备
    var actor = _.findWhere(game.actors, {uid: data.uid});
    if (actor.isReady) {
        logger.error('game||leave||准备失败, 玩家已准备||用户&ID: %j', data.uid);
        cb({code: Code.FAIL, err: consts.ERR_CODE.READY.ALREADY_READY});
        return;
    }
    game.ready(data, cb);
}

exp.kick = function()
{

}

exp.start = function()
{

}


exp.getGameById = function(gameId)
{
    return _.findWhere(gGameList, {gameId: gameId}).game;
}





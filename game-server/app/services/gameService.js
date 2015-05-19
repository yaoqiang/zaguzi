/**
 * Module dependencies
 */
var Game = require('../domain/entity/game');
var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var consts = require('../consts/consts');
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
    var ret = game.join(data);

    if (ret === consts.ROOM.JOIN_RET_CODE.OK)
    {
        cb({code: Code.OK, gameId: game.gameId});
        return;
    }
    cb({code: Code.FAIL, gameId: undefined});

}


exp.ready = function(data)
{
    var game = this.getGameById(data.gameId).game;
    game.ready(data);
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





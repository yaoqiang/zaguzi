var _ = require('underscore');
var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(__filename);

var GamePhase = {
    Starting: 0,
    Action: 1,
    Fan: 2,
    Finished: 3
}

var GameLogic = function(lobby)
{
    logger.log("game will start..");
    this.lobby = lobby; //大厅
    this.cards = [];    //牌

    this.currentPhase = null;
    this.actorOfG = []; //股子玩家
    this.actorOf3 = []; //红3玩家

    this.currentBoss = null;    //本回合Boss
    this.currentRound = 0;

    this.lastFanOutCards = [];
    this.lastFanOutActor = [];
    this.lastFanOutCardRecognization = null;

    this.hasAction = false;

    this.firstActor = null;
    this.lastActors = [];

    this.base = 0;  //基数（每个人亮3数或股子数）



}

GameLogic.prototype.constructor = function()
{
    this.cards = this.initialCards();
    this.currentPhase = GamePhase.Starting;
}

GameLogic.prototype.newGame = function(actors, room)
{

}



//牌面编号从5开始到4结束 5 6 7 8 9 10 J Q K A 2 3 4，最后是4，取值17
//大小鬼分别为19,18，其它牌编号为三位数字，第一位数字代表花色
//1,红方片
//2,红心
//3,黑桃
//4,黑梅花
//如105代表方片5,

//产生扑克牌数组
GameLogic.prototype.initialCards = function(type)
{
    var result = [];

    result[0] = 18; //小王
    result[1] = 19; //大王
    var k = 0;
    for (var i = 0; i<4; i++)
    {
        var j = 0;
        for (j = 0; j < 13; j++)
        {
            result[k+j+2] = (i+1)*100 + (j+5);
        }
        k = k + j;
    }
    //如果是5人局，移除各种6；
    if (type == consts.GAME.TYPE.FIVE)
    {
        result = _.without(result, 106, 206, 306, 406);
    }
    return result;
}

GameLogic.prototype.shuffleCards = function(cards)
{
    return _.shuffle(cards);
}

GameLogic.prototype.getNextActor = function()
{

}



module.exports = GameLogic;
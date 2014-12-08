var GameStatus = require('../logic/gameStatus');


var Actor = function(actorNr, userId)
{
    this.gameStatus = new GameStatus();
    this.properties = {};
    this.isReady = false;
    this.actorNr = actorNr;
    this.userId = userId;
}

Actor.prototype.setActorNr = function(actorNr)
{
    this.actorNr = actorNr;
}

Actor.prototype.getActorNr = function()
{
    return this.actorNr;
}

Actor.prototype.setUserId = function(userId)
{
    this.userId = userId;
}

Actor.prototype.getUserId = function()
{
    return this.userId;
}


module.exports = Actor;
var GameStatus = require('../logic/gameStatus');


var Actor = function(actorNr, uid, sid)
{
    this.gameStatus = new GameStatus();
    this.properties = {};
    this.isReady = false;
    this.actorNr = actorNr;
    this.uid = uid;
    this.sid = sid; //connector server id
}

Actor.prototype.setActorNr = function(actorNr)
{
    this.actorNr = actorNr;
}

Actor.prototype.getActorNr = function()
{
    return this.actorNr;
}

Actor.prototype.setUid = function(uid)
{
    this.uid = uid;
}

Actor.prototype.getUid = function()
{
    return this.uid;
}

Actor.prototype.setProperties = function (properties) {
    this.properties = properties;
}

Actor.prototype.getProperties = function () {
    return this.properties;
}




module.exports = Actor;
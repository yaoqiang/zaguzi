var util = require('util');

var Entity = require('./entity');

var GameRecord = function (opts) {
    Entity.call(this, opts);
    this.lobby = opts.lobby;
    this.roomId = opts.roomId;
    this.result = opts.result;
    this.share = opts.share;
    this.meeting = opts.meeting;
    createdAt = new Date();
}

/////////////////
//emit..
/////////////////
GameRecord.prototype.save = function () {
    this.emit('save');
}

util.inherits(GameRecord, Entity);
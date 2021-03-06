var exp = module.exports;
var dispatcher = require('./dispatcher');
var gameUtil = require('./gameUtil');
var consts = require('../consts/consts');
var _ = require('lodash');

exp.chat = function(session, msg, app, cb) {
    var chatServers = app.getServersByType('chat');

    if(!chatServers || chatServers.length === 0) {
        cb(new Error('can not find chat servers.'));
        return;
    }

    var res = dispatcher.dispatch(session.get('rid'), chatServers);

    cb(null, res.id);
};

exp.game = function(session, msg, app, cb) {
    var gameServers = app.getServersByType('game');

    if(!gameServers || gameServers.length === 0) {
        cb(new Error('can not find game servers.'));
        return;
    }

    var roomId = msg.args[0].roomId || 11;

    var serverId = gameUtil.getRoomById(roomId).serverId;

    cb(null, serverId  || gameServers[0].id);
};
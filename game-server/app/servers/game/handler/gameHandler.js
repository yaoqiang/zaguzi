var Code = require('../../../../../shared/code');
var async = require('async');
var utils = require('../../../util/utils');
var rooms = require('../../../../config/data/room');

var logger = require('pomelo-logger').getLogger(__filename);
var _ = require('underscore');
var pomelo = require('pomelo');


module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
    if (!this.app)
        logger.error(app);
};

var handler = Handler.prototype;



handler.join = function (msg, session, next) {
    msg.serverId = session.get('serverId');
    msg.uid = session.uid;

    var roomId = msg.roomId, self = this;

    // join game
    self.app.rpc.manager.gameRemote.join(session, msg, function (err, data) {
        console.log('data=', data);
        if (data.code === Code.FAIL)
        {
            next(null, {code: Code.FAIL});
            return;
        }

        session.set('roomId', roomId);
        session.set('gameId', data.gameId);
        session.pushAll();

        next(null, {code: Code.OK});
    });

};

handler.ready = function (msg, session, next) {

};

handler.leave = function (msg, session, next) {

};


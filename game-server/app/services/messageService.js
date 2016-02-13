var pomelo = require('pomelo');
var consts = require('../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.GAME);

var messageService = module.exports;

messageService.pushMessageByUids = function (uids, route, msg) {
    pomelo.app.get('channelService').pushMessageByUids(route, msg, uids, errHandler);
};

messageService.pushMessageToPlayer = function (uid, route, msg) {
    messageService.pushMessageByUids([uid], route, msg);
};



function errHandler(err, fails){
    if(!!err){
        logger.error('Push Message error! %j', err.stack);
    }
}
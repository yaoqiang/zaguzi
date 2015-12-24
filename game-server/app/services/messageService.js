var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger(__filename);

var exp = module.exports;

exp.pushMessageByUids = function (uids, route, msg) {
    pomelo.app.get('channelService').pushMessageByUids(route, msg, uids, errHandler);
};

exp.pushMessageToPlayer = function (uid, route, msg) {
    exp.pushMessageByUids([uid], route, msg);
};



function errHandler(err, fails){
    if(!!err){
        logger.error('Push Message error! %j', err.stack);
    }
}
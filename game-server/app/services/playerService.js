var userDao = require('../dao/userDao');
var _ = require('underscore');
var pomelo = require('pomelo');

var exp = module.exports;


exp.getUserInfo = function (uid, cb) {

    userDao.getUserById(uid, function (user) {
        cb(user);
    });

}


exp.onUserEnter = function (uid, serverId, sessionId, player, cb) {
    var u = _.findWhere(pomelo.app.userCache, {uid: uid});
    if (u)
    {
        u.serverId = serverId;
        u.sessionId = sessionId;
    }
    else
    {
        pomelo.app.userCache.push({uid: uid, serverId: serverId, sessionId: sessionId, player: player});
    }
    cb();
}

exp.onUserLeave = function (uid, cb) {
    var u = _.findWhere(pomelo.app.userCache, {uid: uid});
    if (!!u.gameId)
    {
        u.serverId = undefined;
        u.sessionId = undefined;
    }
    else
    {
        pomelo.app.userCache = _.without(pomelo.app.userCache, u);
    }
    cb();
}

exp.getUserCacheByUid = function (uid, cb) {
    console.log('user cache => ', pomelo.app.userCache);
    var u = _.findWhere(pomelo.app.userCache, {uid: uid});
    cb(u);
}

exp.getUserCacheBySessionId = function (sessionId, cb) {
    var u = _.findWhere(pomelo.app.userCache, {sessionId: sessionId});
    cb(u);
}
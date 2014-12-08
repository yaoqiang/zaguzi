var userDao = require('../dao/userDao');
var _ = require('underscore');
var pomelo = require('pomelo');

var exp = module.exports;


exp.getUserInfo = function (uid, cb) {

    userDao.getUserById(uid, function (user) {
        cb(user);
    });

}


exp.onUserEnter = function (uid, serverId, sessionId, player) {
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
}

exp.onUserLeave = function (uid) {
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
}

exp.getUserCacheByUid = function (uid) {
    var u = _.findWhere(pomelo.app.userCache, {uid: uid});
    return u;
}

exp.getUserCacheBySessionId = function (sessionId) {
    var u = _.findWhere(pomelo.app.userCache, {sessionId: sessionId});
    return u;
}
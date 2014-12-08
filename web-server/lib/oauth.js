//var everyauth = require('everyauth');
//var oauth = require('../config/oauth');
//var userDao = require('./dao/userDao');
//
//
////weibo oauth
//everyauth.weibo
//    .appId(oauth.weibo.appId)
//    .appSecret(oauth.weibo.appSecret)
//    .myHostname(oauth.hostname)
//    .findOrCreateUser(function (session, accessToken, accessTokExtra, weiboUserMetadata) {
//        var p = this.Promise();
//        findOrCreateUser(session, weiboUserMetadata.screen_name, 'weibo', p);
//        return p;
//    })
//    .redirectPath(oauth.redirectPath);
//
//
//everyauth.everymodule.findUserById(function (req, id, callback) {
//    callback();
//});
//
//var findOrCreateUser = function (session, authId, from, p) {
//    var username = authId + '@' + from;
//    userDao.getUserByName(username, function (err, user) {
//        if (err || !user) {
//            userDao.createUser(username, '', from, function (err, user) {
//                if (!err) {
//                    session.userId = user.id;
//                    p.fulfill(user);
//                }
//            });
//        } else {
//            session.userId = user.id;
//            p.fulfill(user);
//        }
//    });
//};
//
//module.exports = everyauth;

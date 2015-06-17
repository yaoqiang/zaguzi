var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');

var async = require('async');
require('date-utils');
var utils = require('../util/utils');
var consts = require('../consts/consts');
var globals = require('../../config/data/globals');

var User = require('../domain/user');
var Player = require('../domain/entity/player');
var Properties = require('../domain/entity/properties');



var userDao = module.exports;

/**
 * Get user data by username.
 * @param {String} username
 * @param {String} passwd
 * @param {function} cb
 */
userDao.getUserInfo = function (username, passwd, cb) {
    var sql = 'select * from user where username = ?';
    var args = [username];

    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err !== null) {
            utils.invokeCallback(cb, err, null);
        } else {
            var userId = 0;
            if (!!res && res.length === 1) {
                var rs = res[0];
                userId = rs.id;
                rs.uid = rs.id;
                utils.invokeCallback(cb,null, rs);
            } else {
                utils.invokeCallback(cb, null, {uid:0, username: username});
            }
        }
    });
};


/**
 * Get an user's all players by userId
 * @param {Number} uid User Id.
 * @param {function} cb Callback function.
 */
userDao.getPlayerByUid = function(uid, cb){
    var sql = 'select * from player where userId = ?';
    var args = [uid];

    var sql4Properties = 'select * from properties where userId = ?';


    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }

        if(!res || res.length <= 0) {
            utils.invokeCallback(cb, null, null);
            return;
        } else {

            res = res[0];

            var player = new Player({
                id: res.id,
                uid: res.uid,
                nickName: res.nickName,
                avatar: res.avatar,
                gold:  res.gold,
                winNr: res.winNr,
                loseNr: res.loseNr,
                rank: res.rank,
                fragment: res.fragment
            });
            pomelo.app.get('dbclient').query(sql4Properties,args,function(err, res) {
                if (err) {
                    utils.invokeCallback(cb, err.message, null);
                    return;
                }

                if (!res || res.length <= 0) {
                    utils.invokeCallback(cb, null, null);
                    return;
                } else {

                    var opts = res[0];

                    var properties = new Properties({
                        id: opts.id,
                        userId: opts.userId,
                        lastLogin: opts.lastLogin,
                        getBankruptNr: opts.getBankruptNr,
                        continuousLoginNr: opts.continuousLoginNr,
                        isGetContinuousLogin: opts.isGetContinuousLogin,
                        isFirstPay: opts.isFirstPay,
                        taskJson: JSON.parse(opts.taskJson),
                        itemJson: JSON.parse(opts.itemJson)
                    });

                    player.properties = properties;
                    utils.invokeCallback(cb, null, player);

                }
            });
        }
    });
};

/**
 * get user infomation by userId
 * @param {String} uid UserId
 * @param {function} cb Callback function
 */
userDao.getUserById = function (uid, cb){
    var sql = 'select * from user where id = ?';
    var args = [uid];
    pomelo.app.get('dbclient').query(sql,args,function(err, res){
        if(err !== null){
            utils.invokeCallback(cb,err.message, null);
            return;
        }

        if (!!res && res.length > 0) {
            utils.invokeCallback(cb, null, new User(res[0]));
        } else {
            utils.invokeCallback(cb, ' user not exist ', null);
        }
    });
};



/**
 * Create a new player
 * @param {String} uid User id.
 * @param {function} cb Callback function
 */
userDao.createPlayer = function (uid, cb){
    var sql = 'insert into player (userId, nickName, avatar, gold, rank, fragment) values(?,?,?,?,?,?)';

    var sql4Properties = 'insert into properties (userId, lastLogin, getBankruptNr, continuousLoginNr, isGetContinuousLogin, isFirstPay, taskJson, itemJson) values(?,?,?,?,?,?,?,?)';

    var nickName = globals[0][Math.floor(Math.random()*globals[0].length)];
    var avatar = Math.floor(Math.random()*globals[0].length);
    var args = [uid, nickName, avatar, consts.GLOBAL.GOLD_INIT, 1, 0, Date.now(), 0, 1];
    var args4p = [uid, (new Date()).getDate(), 0, 0, 0, 0, '{}', '{}'];

    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err !== null){
            logger.error('create player failed! ' + err.message);
            logger.error(err);
            utils.invokeCallback(cb,err.message, null);
        } else {
            var player = new Player({
                id: res.insertId,
                uid: uid,
                nickName: nickName,
                avatar: avatar,
                gold:  consts.GLOBAL.GOLD_INIT,
                winNr: 0,
                loseNr: 0,
                rank: 1,
                fragment: 0
            });

            pomelo.app.get('dbclient').insert(sql4Properties, args4p, function(err,res) {
                if (err !== null) {
                    logger.error('create player properties failed! ' + err.message);
                    logger.error(err);
                    utils.invokeCallback(cb, err.message, null);
                } else {

                    var selectSql = 'select * from properties where id = ?';
                    var selectArgs = [res.insertId];
                    pomelo.app.get('dbclient').query(selectSql, selectArgs, function(err,res) {
                        if (err !== null) {
                            logger.error('create player failed! ' + err.message);
                            logger.error(err);
                            utils.invokeCallback(cb, err.message, null);
                        } else {
                            var opts = res[0];

                            var properties = new Properties({
                                id: opts.id,
                                userId: opts.userId,
                                lastLogin: opts.lastLogin,
                                getBankruptNr: opts.getBankruptNr,
                                continuousLoginNr: opts.continuousLoginNr,
                                isGetContinuousLogin: opts.isGetContinuousLogin,
                                isFirstPay: opts.isFirstPay,
                                taskJson: JSON.parse(opts.taskJson),
                                itemJson: JSON.parse(opts.itemJson)
                            });
                            player.properties = properties;
                            utils.invokeCallback(cb, null, player);
                        }
                    });

                }
            });


        }
    });
};


/**
 * Update a player
 * @param {Object} player The player need to update, all the propties will be update.
 * @param {function} cb Callback function.
 */
userDao.updatePlayer = function (player, cb){

};

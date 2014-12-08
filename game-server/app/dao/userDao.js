var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');

var async = require('async');
require('date-utils');
var utils = require('../util/utils');
var consts = require('../consts/consts');
var globals = require('../../config/data/globals');

var User = require('../domain/user');
var Player = require('../domain/entity/player');



var userDao = module.exports;

/**
 * Get user data by username.
 * @param {String} username
 * @param {String} passwd
 * @param {function} cb
 */
userDao.getUserInfo = function (username, passwd, cb) {
    var sql = 'select * from	User where username = ?';
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
    var sql = 'select * from Player where userId = ?';
    var args = [uid];

    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }

        if(!res || res.length <= 0) {
            utils.invokeCallback(cb, null, []);
            return;
        } else {
            utils.invokeCallback(cb, null, res);
        }
    });
};

/**
 * get user infomation by userId
 * @param {String} uid UserId
 * @param {function} cb Callback function
 */
userDao.getUserById = function (uid, cb){
    var sql = 'select * from	User where id = ?';
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
    var sql = 'insert into Player (userId, nickName, avatar, gold, rank, fragment, lastLogin, getBankruptNr, continuousLoginNr) values(?,?,?,?,?,?,?,?,?)';

    var nickName = globals[0][Math.floor(Math.random()*globals[0].length)];
    var avatar = Math.floor(Math.random()*globals[0].length);
    var args = [uid, nickName, avatar, consts.GLOBAL.GOLD_INIT, 1, 0, Date.now(), 0, 1];

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
                rank: 1,
                fragment: 0,
                lastLogin: Date.now(),
                getBankruptNr: 0,
                continuousLoginNr: 1
            });
            utils.invokeCallback(cb, null, [player]);
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

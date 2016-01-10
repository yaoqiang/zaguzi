var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.SYSTEM);
var pomelo = require('pomelo');
var _ = require('lodash');

var async = require('async');
require('date-utils');
var utils = require('../util/utils');
var globals = require('../../config/data/globals');

var User = require('../domain/user');
var Player = require('../domain/entity/player');
var taskUtil = require('../domain/entity/task');

var db = pomelo.app.get('dbclient');
var mongojs = require('mongojs');

var userDao = module.exports;

/**
 * Get user data by username.
 * @param {String} username
 * @param {String} passwd
 * @param {function} cb
 */
userDao.getUserInfo = function(username, passwd, cb) {

    db.user.findOne({
        username: username
    }, function(err, user) {
        if (err !== null) {
            utils.invokeCallback(cb, err, null);
        } else {
            if (user) {
                utils.invokeCallback(cb, null, user);
            } else {
                utils.invokeCallback(cb, null, {
                    uid: 0,
                    username: username
                });
            }
        }
    });

};


/**
 * Get an user's all players by userId
 * @param {Number} uid User Id.
 * @param {function} cb Callback function.
 */
userDao.getPlayerByUid = function(uid, cb) {
    db.player.findOne({
        uid: mongojs.ObjectId(uid)
    }, function(err, doc) {
        if (err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }

        if (_.isNull(doc)) {
            utils.invokeCallback(cb, null, null);
            return;
        }

        var player = new Player({
            id: doc._id,
            uid: doc.uid,
            nickName: doc.nickName,
            avatar: doc.avatar,
            gender: doc.gender,
            gold: doc.gold,
            winNr: doc.winNr,
            loseNr: doc.loseNr,
            tieNr: doc.tieNr,
            rank: doc.rank,
            exp: doc.exp,
            fragment: doc.fragment,
            items: doc.items,
            tasks: doc.tasks,
            meetingTimes: doc.meetingTimes,
            properties: doc.properties,
            createdAt: doc.createdAt
        });

        utils.invokeCallback(cb, null, player);

    });

};

/**
 * get user infomation by userId
 * @param {String} uid UserId
 * @param {function} cb Callback function
 */
userDao.getUserById = function(uid, cb) {
    db.user.findOne({
        _id: mongojs.ObjectId(uid)
    }, function(err, doc) {
        if (err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }

        if (doc) {
            utils.invokeCallback(cb, null, new User(doc));
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
userDao.createPlayer = function(uid, cb) {

    var nickName = globals.defaultNickname[Math.floor(Math.random() * globals.defaultNickname.length)];
    var avatar = Math.floor(Math.random() * globals.defaultAvatar.length);
    var player = {
        uid: mongojs.ObjectId(uid),
        nickName: nickName,
        avatar: avatar,
        gender: consts.GLOBAL.GENDER.MALE,
        gold: consts.GLOBAL.GOLD_INIT,
        winNr: 0,
        loseNr: 0,
        tieNr: 0,
        rank: 1,
        exp: 0,
        fragment: 0,
        meetingTimes: 0,
        properties: {
            getBankruptcyGrantNr: 0,
            getBankruptcyGrantRunOut: false,
            lastCheckIn: null,
            continuousCheckInNr: 0,
            getCheckInGrant: false,
            isPayed: false,
            lastLoginAt: null
        },
        items: [],
        tasks: taskUtil.initTasks(),
        createdAt: new Date()
    };

    db.player.save(player, function(err, doc) {
        if (err || _.isNull(doc)) {
            logger.error('create player failed! ' + err.message);
            logger.error(err);
            utils.invokeCallback(cb, err.message, null);
            return;
        }
        player.id = doc._id;
        utils.invokeCallback(cb, null, player);
    });
};


/**
 * Update a player
 * @param {Object} player The player need to update, all the properties will be update.
 * @param {function} cb Callback function.
 */
userDao.updatePlayer = function(player, cb) {

};

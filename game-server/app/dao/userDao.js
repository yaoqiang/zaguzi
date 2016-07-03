var consts = require('../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.USER);
var pomelo = require('pomelo-rt');
var _ = require('lodash');

var async = require('async');
require('date-utils');
var utils = require('../util/utils');
var globals = require('../../config/data/globals');
var itemConf = require('../../config/data/item');

var User = require('../domain/user');
var Player = require('../domain/entity/player');
var taskUtil = require('../domain/entity/task');
var Code = require('../../../shared/code');
var db = pomelo.app.get('dbclient');
var mongojs = require('mongojs');

var userDao = module.exports;

/**
 * Get user data by username.
 * @param {String} username
 * @param {String} passwd
 * @param {function} cb
 */
userDao.getUserInfo = function (username, passwd, cb) {

    db.user.findOne({
        username: username
    }, function (err, user) {
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
userDao.getPlayerByUid = function (uid, cb) {
    db.player.findOne({
        uid: mongojs.ObjectId(uid)
    }, function (err, doc) {
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
            gender: doc.gender == null ? consts.GLOBAL.GENDER.MALE : doc.gender,
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
            summary: doc.summary,
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
userDao.getUserById = function (uid, cb) {
    db.user.findOne({
        _id: mongojs.ObjectId(uid)
    }, function (err, doc) {
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
userDao.createPlayer = function (uid, cb) {

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
        summary: '',
        createdAt: new Date()
    };

    db.player.save(player, function (err, doc) {
        if (err || _.isNull(doc)) {
            logger.error("%j", {
                uid: uid,
                type: consts.LOG.CONF.USER.TYPE,
                action: consts.LOG.CONF.USER.ACTION.CREATE_PLAYER,
                message: '账号创建Player失败, mongo存储失败',
                created: new Date(),
                detail: {error: err}
            });
            utils.invokeCallback(cb, err.message, null);
            return;
        }
        player.id = doc._id;
        utils.invokeCallback(cb, null, player);
    });
};


/**
 * 更新玩家头像
 * data: {uid: xx, avatar: String}
 */
userDao.updateAvatar = function (data, cb) {
    db.player.findAndModify({
        query: {uid: mongojs.ObjectId(data.uid)},
        update: {$set: {avatar: data.avatar}}
    }, function (err, doc, lastErrorObject) {
        if (err) {
            
            utils.invokeCallback(cb, err, null);
        } else {
            
            utils.invokeCallback(cb, null, doc);
        }
    });
}

/**
 * 更新玩家金币
 * data: {uid: xx, gold: xx}
 */
userDao.updatePlayerGold = function (data, cb) {
    db.player.findAndModify({
        query: {uid: mongojs.ObjectId(data.uid)},
        update: {$inc: {gold: data.gold}}
    }, function (err, doc, lastErrorObject) {
        if (err) {
            logger.info("%j", {
                uid: data.uid,
                type: consts.LOG.CONF.USER.TYPE,
                action: consts.LOG.CONF.USER.ACTION.ADD_GOLD,
                message: '添加金币失败',
                created: new Date(),
                detail: {type: data.type, gold: data.gold}
            });
            utils.invokeCallback(cb, err, null);
        } else {
            logger.info("%j", {
                uid: data.uid,
                type: consts.LOG.CONF.USER.TYPE,
                action: consts.LOG.CONF.USER.ACTION.ADD_GOLD,
                message: '添加金币成功',
                created: new Date(),
                detail: {type: data.type, value: data.gold}
            });
            utils.invokeCallback(cb, null, doc);
        }
    });
}


/**
 * 更新玩家物品
 * data: {uid: xx, items: [{id: Int, value: Int}]}
 */
userDao.updatePlayerItems = function (data, cb) {
    db.player.findOne({uid: mongojs.ObjectId(data.uid)}, function (err, doc, lastErrorObject) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {

            //add items..
            function addItem(player, type, item) {
                if (!_.isObject(item)) {
                    logger.error("%j", {
                        uid: player.uid,
                        type: consts.LOG.CONF.USER.TYPE,
                        action: consts.LOG.CONF.USER.ACTION.ADD_ITEM,
                        message: '获得物品失败-参数错误',
                        created: new Date(),
                        detail: {type: type, itemId: item.id, value: item.value}
                    });
                    return false;
                }

                //查找物品是否在配置表中, data: item.json的item对象
                var data = _.findWhere(itemConf, {id: item.id});

                if (_.isUndefined(data)) {
                    logger.error("%j", {
                        uid: player.uid,
                        type: consts.LOG.CONF.USER.TYPE,
                        action: consts.LOG.CONF.USER.ACTION.ADD_ITEM,
                        message: '获得物品失败-参数错误',
                        created: new Date(),
                        detail: {type: type, itemId: item.id, value: item.value}
                    });
                    return false;
                }
                //查询玩家是否有该物品, i: player.items
                var i = _.findWhere(player.items, {id: item.id});
                logger.info("%j", {
                    uid: player.uid,
                    type: consts.LOG.CONF.USER.TYPE,
                    action: consts.LOG.CONF.USER.ACTION.ADD_ITEM,
                    message: '添加物品成功',
                    created: new Date(),
                    detail: {type: type, itemId: item.id, item: data.title, value: item.value}
                });
                var value;
                var now = new Date();
                //如果玩家没有该物品, 则添加; 否则叠加
                if (_.isUndefined(i)) {
                    if (data.mode == consts.GLOBAL.ITEM_MODE.TERM) {
                        value = now.add({days: item.value});
                    }
                    else {
                        value = item.value;
                    }
                } else {
                    if (data.mode == consts.GLOBAL.ITEM_MODE.TERM) {
                        //如果已过期, 则从现在叠加
                        if (new Date(i.value).isBefore(now)) {
                            value = now.add({days: item.value});
                        } else {
                            value = new Date(i.value).add({days: item.value});
                        }
                    }
                    else {
                        value = i.value + item.value;
                    }
                }
                //如果玩家之前没有该物品, 则push; 如果有,则修改
                if (_.isUndefined(i)) {

                    var insertItem = {
                        id: data.id,
                        name: data.name,
                        title: data.title,
                        icon: data.icon,
                        value: value,
                        mode: data.mode
                    };

                    db.player.update({uid: mongojs.ObjectId(player.uid)}, {$push: {items: insertItem}}, function (err, doc) {
                        
                    })
                } else {
                    db.player.update({
                        uid: mongojs.ObjectId(player.uid),
                        'items.id': i.id
                    }, {$set: {'items.$.value': value}}, function (err, doc) {

                    });
                }
                return true;
            }

            var result = _.map(data.items, function (item) {
                return addItem(doc, data.type, item);
            });

            if (_.contains(result, false)) {
                utils.invokeCallback(cb, {code: Code.FAIL}, null);
                return;
            }

            utils.invokeCallback(cb, null, doc);
        }
    });
}

/**
 * 更新玩家元宝数
 * data: {uid: xx, fragment: xx, type: xx}
 */
userDao.updatePlayerFragment = function (data, cb) {
    db.player.findAndModify({
        query: {uid: mongojs.ObjectId(data.uid)},
        update: {$inc: {fragment: data.fragment}}
    }, function (err, doc, lastErrorObject) {
        if (err) {
            logger.info("%j", {
                uid: data.uid,
                type: consts.LOG.CONF.USER.TYPE,
                action: consts.LOG.CONF.USER.ACTION.ADD_FRAGMENT,
                message: '添加元宝失败',
                created: new Date(),
                detail: {type: data.type, value: data.fragment}
            });
            utils.invokeCallback(cb, err, null);
        } else {
            logger.info("%j", {
                uid: data.uid,
                type: consts.LOG.CONF.USER.TYPE,
                action: consts.LOG.CONF.USER.ACTION.ADD_FRAGMENT,
                message: '添加元宝成功',
                created: new Date(),
                detail: {type: data.type, value: data.fragment}
            });
            utils.invokeCallback(cb, null, doc);
        }
    })
}

/**
 * 根据mobile查询用户是否存在，true: 存在，false: 不存在
 */
userDao.findByMobile = function (mobile, cb) {
    db.user.findOne({
        mobile: mobile
    }, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }

        if (doc) {
            utils.invokeCallback(cb, null, true);
        } else {
            utils.invokeCallback(cb, null, false);
        }
    });
}

userDao.findOneByMobile = function (mobile, cb) {
    db.user.findOne({
        mobile: mobile
    }, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }

        if (doc) {
            utils.invokeCallback(cb, null, doc);
        } else {
            utils.invokeCallback(cb, null, null);
        }
    });
}

/**
 * 根据shortid查询用户是否存在，true: 存在，false: 不存在
 */
userDao.findByShortid = function (shortid, cb) {
    db.user.findOne({
        shortid: shortid
    }, function (err, doc) {
        if (err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }

        if (doc) {
            utils.invokeCallback(cb, null, doc);
        } else {
            utils.invokeCallback(cb, null, null);
        }
    });
}
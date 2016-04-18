var express = require('express');
var qs = require('qs');

var fs = require('fs');

var _ = require('lodash');

var crypto = require('crypto');

var consts = require('../../consts/consts');
var utils = require('../../util/utils');

var log4js = require('log4js');
var log4jsConf = require(__dirname + "/../../../config/log4jsCustom.json");
log4js.configure(log4jsConf, {});


var logger = require('log4js').getLogger(consts.LOG.GAME_HTTP);   //game-http
var loggerPayment = require('log4js').getLogger(consts.LOG.PAYMENT);


var game = express.Router();

//
var acceptIpList = ['127.0.0.1', '101.200.128.237', '101.201.154.38'];

/**
 * @param app: Pomelo App
 */
module.exports = function (app) {
    game.get('/', function (req, res) {
        logger.debug('game api root route.');
        res.sendStatus(200);
    });

    /**
     * 为玩家充值，使用场景：当玩家通过人工转账方式充值，则需要客服人员在业务系统操作
     * req.body {JSON} = {uid: String, productId: Int, device: String}
     * 注：productId和device要配置正确, 1xxxx均为android, 2xxxxx为ios. 否则会找不到商品
     */
    game.post('/payment4OSS', function (req, res) {
        loggerPayment.debug('payment4OSS  route....');
        //参数
        var paymentData = req.body;

        //NOTE: 身份验证(线上IP验证)
        var ipAddress = utils.getIpAddress(req.connection.remoteAddress);
        loggerPayment.debug('# from ip -> %s', ipAddress);

        if (!_.contains(acceptIpList, ipAddress)) {
            loggerPayment.error("%j", {
                uid: paymentData.uid,
                orderSerialNumber: null,
                type: consts.LOG.CONF.PAYMENT,
                action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                message: '非法IP直接操作HTTP，为玩家充值',
                created: new Date(),
                detail: {ipAddress: ipAddress}
            });
            res.sendStatus(401);
            return;
        }

        if (paymentData.uid == null || paymentData.uid == undefined || paymentData.productId == null || paymentData.productId == undefined) {
            res.sendStatus(400);
            return;
        }

        paymentData.device = paymentData.device || 'android';

        //remote call
        try {
            app.rpc.manager.universalRemote.payment4OSS(null, paymentData, function (data) {
                loggerPayment.debug('处理OSS的支付逻辑 rpc invoke finished.');
                res.sendStatus(data.code);
            });
        } catch (err) {
            loggerPayment.error("处理OSS的支付逻辑时候发生异常 %j", {err: err, req: {body: req.body}});
            res.sendStatus(500);
        }


    });
    
    /**
     * 为将来的PC或H5预留Pingpp充值凭证创建接口
     * req.body {JSON} = {uid: String, channel: open.PAYMENT.PINGPP.channel, amount: 分, productId: Int, device: 'ios'/'android', clientIp: String}
     * 注：productId和device要配置正确, 1xxxx均为android, 2xxxxx为ios. 否则会找不到商品
     */
    game.use('/requestCharge', function (req, res) {
        var chargeData = req.body;

        if (chargeData.channel == null || chargeData.channel == undefined || chargeData.channel == ''
            || chargeData.amount == null || chargeData.amount == undefined || chargeData.amount == '') {
            res.sendStatus(400);
            return;
        }

        try {
            app.rpc.manager.universalRemote.requestChargesPingxx(null, chargeData, function (data) {
                loggerPayment.debug('创建PingppCharge逻辑 rpc invoke finished.');
                res.sendStatus(data.code);
            });
        } catch (err) {
            loggerPayment.error("创建PingppCharge逻辑时候发生异常 %j", {err: err, req: {body: req.body}});
            res.sendStatus(500);
        }
    });

    //获得商城列表
    game.get('/getShopList', function (req, res) {
        var data = {device: req.query.device || 'android'};
        app.rpc.manager.universalRemote.getShopList(null, data, function (data) {
            logger.debug('获取商城列表 rpc invoke finished.');
                res.send(data);
        });
    });
    
    //获得物品信息
    game.get('/getItemList', function (req, res) {
        app.rpc.manager.universalRemote.getItemList(null, null, function (data) {
            logger.debug('获取物品列表 rpc invoke finished.');
                res.send(data);
        });
    });
    
    //获得兑换列表
    game.get('/getExchangeListNew', function (req, res) {
        app.rpc.manager.universalRemote.getExchangeListNew(null, {os: 'android'}, function (data) {
            logger.debug('获得兑换列表 rpc invoke finished.');
                res.send(data);
        });
    });
    
    //根据uid获得玩家兑换记录
    game.get('/getMyExchangeRecordList', function (req, res) {
        if (!req.query.uid) {
            res.sendStatus(400);
            return;
        }
        app.rpc.manager.universalRemote.getMyExchangeRecordList(null, {uid: req.query.uid}, function (data) {
            logger.debug('获得玩家兑换记录 rpc invoke finished.');
                res.send(data);
        });
    });
    
    //根据排行榜类型获得排行榜信息： type: const.RANKING_LIST.x
    game.get('/getRankingList', function (req, res) {
        if (!req.query.type) {
            res.sendStatus(400);
            return;
        }
        app.rpc.manager.universalRemote.getRankingList(null, {uid: req.query.type}, function (data) {
            logger.debug('获得玩家兑换记录 rpc invoke finished.');
                res.send(data);
        });
    });
    
    
    /**
     * 为玩家添加金币：不走订单系统；使用场景：活动奖励，内部人士等
     * @param data: {uid: String, type: const.GLOBAL.ADD_GOLD_TYPE.x, gold: Int}
     */
    game.post('/addGold', function (req, res) {
        var data = req.body;
        try {
            if (!data.uid || !data.type || !data.gold) {
                res.sendStatus(400);
                return;
            }
       
            app.rpc.manager.userRemote.addGold(null, data, function (data) {
                logger.debug('手工添加金币调用完成');
                res.send(data);
            });
        } catch (e) {
            logger.debug('手工添加金币异常 %j', {error: e});
            res.sendStatus(500);
        }
        
    });
    
    /**
     * 为玩家添加物品：不走订单系统；使用场景：活动奖励，内部人士等
     * @param data: {JSON} = {uid: String, type: const.GLOBAL.ADD_GOLD_TYPE.x, items: [{id: Int, value: Int}]}
     */
    game.post('/addItems', function(req, res) {
        var data = req.body;
        try {
            console.log(data.items);
            console.log(!_.isArray(data.items));
            console.log(data.items.length === 0);
            console.log(data.items.length === 0);
            if (!data.uid || !data.type || !data.items || !_.isArray(data.items) || data.items.length === 0) {
                res.sendStatus(400);
                return;
            }
       
            app.rpc.manager.userRemote.addItems(null, data, function (data) {
                logger.debug('手工添加物品调用完成');
                res.send(data);
            });
        } catch (e) {
            logger.error('手工添加物品异常 %j', {error: e});
            res.sendStatus(500);;
        }
    });
    
    /**
     * 为玩家添加元宝：不走订单系统；使用场景：活动奖励，内部人士等
     * @param data: {JSON} = {uid: String, type: const.GLOBAL.ADD_FRAGMENT_TYPE, fragment: Int}
     */
    game.post('/addFragment', function(req, res) {
        var data = req.body;
        try {
            if (!data.uid || !data.type || !data.fragment) {
                res.sendStatus(400);
                return;
            }
       
            app.rpc.manager.userRemote.addFragment(null, data, function (data) {
                logger.debug('手工添加元宝调用完成');
                res.send(data);
            });
        } catch (e) {
            logger.error('手工添加元宝异常 %j', {error: e});
            res.sendStatus(500);
        }
    });
    
    //发送公告信息
    game.post('/BBS', function(req, res) {
        
    });


    /**
     * 获取游戏服务器缓存中在线人数总数
     */
    game.get('/getOnlineUserTotal', function (req, res) {
        try {
            app.rpc.manager.userRemote.getAllOnlineUser(null, function (data) {
                logger.debug('获取当前在线用户情况成功');
                res.send({onlineUserTotal: data.userList.length});
            });
        } catch (err) {
            logger.error("获取当前在线用户情况失败 %j", {err: err});
            res.sendStatus(500);
        }
    });

    /**
     * 获取游戏服务器缓存中指定uids的玩家信息
     * req.query = {uids: String} = 'id,id,id'
     */
    game.get('/getOnlineUserByUids', function (req, res) {
        try {
            var uids = req.query.uids;
            uids = uids.split(',');
            app.rpc.manager.userRemote.getUsersCacheByUids(null, {uids: uids}, function (data) {
                logger.debug('获取指定uids的玩家情况成功');
                res.send(data);
            });
        } catch (err) {
            logger.error("获取指定uids的玩家情况失败 %j", {err: err, req: req.query});
            res.sendStatus(500);
        }
    });






    return game;
}

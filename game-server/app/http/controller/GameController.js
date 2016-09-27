var express = require('express');
var qs = require('qs');

var fs = require('fs');

var _ = require('lodash');

var crypto = require('crypto');

var consts = require('../../consts/consts');
var open = require('../../consts/open');
var utils = require('../../util/utils');

var log4js = require('log4js');
var log4jsConf = require(__dirname + "/../../../config/log4jsCustom.json");
log4js.configure(log4jsConf, {});


var logger = require('log4js').getLogger(consts.LOG.GAME_HTTP);   //game-http
var loggerPayment = require('log4js').getLogger(consts.LOG.PAYMENT);

var qiniu = require("qiniu");


qiniu.conf.ACCESS_KEY = open.QINIU.ACCESS_KEY;
qiniu.conf.SECRET_KEY = open.QINIU.SECRET_KEY;



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

    function authenticationIpAddress(req, res, next) {
        //NOTE: 身份验证(线上IP验证)
        var ipAddress = utils.getIpAddress(req.connection.remoteAddress);
        logger.debug('# from ip -> %s', ipAddress);

        if (!_.contains(acceptIpList, ipAddress)) {
            logger.error("%j", {
                //uid: paymentData.uid,
                orderSerialNumber: null,
                type: consts.LOG.CONF.PAYMENT,
                action: 'ALL',
                message: '非法IP直接操作HTTP',
                created: new Date(),
                detail: {ipAddress: ipAddress}
            });
            res.sendStatus(401);
            return;
        }
        next();
    }
    
    /**
     * Apple IAP充值回调改为HTTP方式, 防止漏单情况(充值成功后,但是游戏连接断开)
     */
    game.post('/payment4AppleIAP', function (req, res) {
        loggerPayment.debug('payment4AppleIAP  route....');

        //参数
        var paymentData = req.body;

        loggerPayment.info("%j", {
                    uid: paymentData.uid,
                    type: consts.LOG.CONF.PAYMENT.TYPE,
                    action: consts.LOG.CONF.PAYMENT.ACTION.PAID_OPTION,
                    message: 'Apple IAP流程开始,准备请求Apple Server验证和处理后续支付逻辑',
                    created: new Date(),
                    detail: paymentData
                });
        

        
        if (paymentData.uid == null || paymentData.uid == undefined || 
        paymentData.productId == null || paymentData.productId == undefined ||
        paymentData.product == null || paymentData.product == undefined) {
            res.sendStatus(400);
            return;
        }
        
        
        //remote call
        try {
            
            app.rpc.manager.universalRemote.payment4IAP(null, paymentData, function (data) {
                loggerPayment.debug('处理Apple IAP的支付逻辑 rpc invoke finished.');
                res.send(data);
            });
        } catch (err) {
            loggerPayment.error("处理Apple IAP的支付逻辑时候发生异常 %j", {err: err, req: {body: req.body}});
            res.sendStatus(500);
        }
        
    })
    
    /**
     * 为玩家充值，使用场景：当玩家通过人工转账方式充值，则需要客服人员在业务系统操作
     * req.body {JSON} = {uid: String, productId: Int, device: String}
     * 注：productId和device要配置正确, 1xxxx均为android, 2xxxxx为ios. 否则会找不到商品
     */
    game.post('/payment4OSS', authenticationIpAddress, function (req, res) {
        loggerPayment.debug('payment4OSS  route....');
        //参数
        var paymentData = req.body;

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
    game.get('/getShopList', authenticationIpAddress, function (req, res) {
        var data = {device: req.query.device || 'android'};
        app.rpc.manager.universalRemote.getShopList(null, data, function (data) {
            logger.debug('获取商城列表 rpc invoke finished.');
                res.send(data);
        });
    });
    
    //获得物品信息
    game.get('/getItemList', authenticationIpAddress, function (req, res) {
        app.rpc.manager.universalRemote.getItemList(null, null, function (data) {
            logger.debug('获取物品列表 rpc invoke finished.');
                res.send(data);
        });
    });
    
    //获得兑换列表
    game.get('/getExchangeListNew', authenticationIpAddress, function (req, res) {
        app.rpc.manager.universalRemote.getExchangeListNew(null, {os: 'android'}, function (data) {
            logger.debug('获得兑换列表 rpc invoke finished.');
                res.send(data);
        });
    });
    
    //根据uid获得玩家兑换记录
    game.get('/getMyExchangeRecordList', authenticationIpAddress, function (req, res) {
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
    game.get('/getRankingList', authenticationIpAddress, function (req, res) {
        if (!req.query.type) {
            res.sendStatus(400);
            return;
        }
        app.rpc.manager.universalRemote.getRankingList(null, {uid: req.query.type}, function (data) {
            logger.debug('获得排行榜信息 rpc invoke finished.');
            res.send(data);
        });
    });

    //获取上月的股神月排行榜获奖记录
    game.get('/getLatestActivityGrantRecordGodMonth', function (req, res) {
        app.rpc.manager.universalRemote.getLatestActivityGrantRecordGodMonth(null, {}, function (data) {
            logger.debug('获得上月的股神月排行榜获奖记录 rpc invoke finished.');
            res.send(data);
        });
    });

    game.get('/getOnlineUserList', authenticationIpAddress, function (req, res) {
        app.rpc.manager.universalRemote.getOnlineUserList(null, {}, function (data) {
            res.send(data);
        });
    });
    
    
    /**
     * 为玩家添加金币：不走订单系统；使用场景：活动奖励，内部人士等
     * @param data: {uid: String, type: const.GLOBAL.ADD_GOLD_TYPE.x, gold: Int}
     */
    game.post('/addGold', authenticationIpAddress, function (req, res) {
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
    game.post('/addItems', authenticationIpAddress, function(req, res) {
        var data = req.body;
        try {
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
    game.post('/addFragment', authenticationIpAddress, function(req, res) {
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


    game.get('/getGameById', authenticationIpAddress, function (req, res) {
        if (!req.query.gameId) {
            res.sendStatus(400);
            return;
        }
        try {
            app.rpc.game.gameRemote.getGameById(null, {gameId: parseInt(req.query.gameId)}, function (data) {
                logger.debug('获取指定game情况成功');
                res.send(data);
            });
        } catch (err) {
            logger.error("获取指定game情况失败 %j", {err: err});
            res.sendStatus(500);
        }
    });

    game.get('/dissolveGameById', authenticationIpAddress, function (req, res) {
        if (!req.query.gameId) {
            res.sendStatus(400);
            return;
        }
        try {
            app.rpc.game.gameRemote.dissolveGameById(null, {gameId: parseInt(req.query.gameId)}, function () {
                logger.debug('解散指定game情况成功');
                res.sendStatus(200);
            });
        } catch (err) {
            logger.error("解散指定game情况失败 %j", {err: err});
            res.sendStatus(500);
        }
    })


    /**
     * 获取游戏服务器缓存中在线人数总数
     */
    game.get('/getOnlineUserTotal', authenticationIpAddress, function (req, res) {
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
    game.get('/getOnlineUserByUids', authenticationIpAddress, function (req, res) {
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

    /**
     * 发送BBS: 公告类互动消息类
     * req.body = {content: content} = ''
     */
    game.post('/sendBBS', authenticationIpAddress, function (req, res) {
        try {
            var data = req.body;
            if (!data.content || data.content == '') {
                res.sendStatus(400);
                return;
            }
            app.rpc.chat.chatRemote.sendBBS(null, data.content, function (data) {
                logger.debug('发送BBS成功');
                res.send(data);
            });
        } catch (err) {
            logger.error("发送BBS失败", {err: err, req: req.body});
            res.sendStatus(500);
        }
    });

    //---------------------------
    // 
    //---------------------------
    //发送找回密码验证码
    game.post('/sendResetPasswordSMS', function (req, res) {
        try {
            var data = req.body;
            
            app.rpc.manager.universalRemote.sendResetPasswordSMS(null, data, function (data) {
                res.send(data);
            });
        } catch (err) {
            logger.error("", {err: err, req: req.body});
            res.send({code: 500});
        }
    });
    
    //重置密码
    game.post('/resetPassword', function (req, res) {
        try {
            var data = req.body;
            
            app.rpc.manager.universalRemote.resetPassword(null, data, function (data) {
                res.send(data);
            });
        } catch (err) {
            logger.error("", {err: err, req: req.body});
            res.send({code: 500});
        }
    });


    game.post('/getQiniuToken', function (req, res) {
        var putPolicy = new qiniu.rs.PutPolicy(open.QINIU.BUCKET);
        //putPolicy.callbackUrl = 'http://your.domain.com/callback';
        //putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)';
        res.send({token: putPolicy.token()});
    })
    
    game.post('/updateAvatar', function (req, res) {
        try {
            var data = req.body;
            
            app.rpc.manager.userRemote.updateAvatar(null, data, function (data) {
                res.send(data);
            });
        } catch (err) {
            logger.error("", {err: err, req: req.body});
            res.send({code: 500});
        }
        
    });


    return game;
}

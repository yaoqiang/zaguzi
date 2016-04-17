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


var logger = require('log4js').getLogger(consts.LOG.PAYMENT);

var game = express.Router();

//
var acceptIpList = ['101.200.128.237', '101.201.154.38'];

/**
 * @param app: Pomelo App
 */
module.exports = function (app) {
    game.get('/', function (req, res) {
        logger.debug('game api root route.');
        res.sendStatus(200);
    });

    game.post('/payment4OSS', function (req, res) {
        logger.debug('payment4OSS  route....');
        //参数
        var paymentData = req.body;

        //NOTE: 身份验证(线上IP验证)
        var ipAddress = utils.getIpAddress(req.connection.remoteAddress);
        logger.debug('# from ip -> %s', ipAddress);

        if (!_.contains(acceptIpList, ipAddress)) {
            logger.error("%j", {
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
            res.send(400);
            return;
        }

        paymentData.device = paymentData.device || 'android';

        //remote call
        try {
            app.rpc.manager.universalRemote.payment4OSS(null, paymentData, function (data) {
                logger.debug('处理OSS的支付逻辑 rpc invoke finished.');
                res.sendStatus(data.code);
            });
        } catch (err) {
            logger.error("处理OSS的支付逻辑时候发生异常 %j", {err: err, req: {body: req.body}});
            res.sendStatus(500);
        }


    });
    
    //web(pc or h5)
    game.use('/requestCharge', function (req, res) {
        var chargeData = req.body;

        if (chargeData.channel == null || chargeData.channel == undefined || chargeData.channel == ''
            || chargeData.amount == null || chargeData.amount == undefined || chargeData.amount == '') {
            res.send(400);
            return;
        }

        try {
            app.rpc.manager.universalRemote.requestChargesPingxx(null, chargeData, function (data) {
                logger.debug('创建PingppCharge逻辑 rpc invoke finished.');
                res.sendStatus(data.code);
            });
        } catch (err) {
            logger.error("创建PingppCharge逻辑时候发生异常 %j", {err: err, req: {body: req.body}});
            res.sendStatus(500);
        }
    });

    game.get('getShopList', function (req, res) {

    });


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

var express = require('express');
var qs = require('qs');

var fs = require('fs');

var crypto = require('crypto');

var consts = require('../../consts/consts');

var log4js = require('log4js');
var log4jsConf = require(__dirname + "/../../..//config/log4jsCustom.json");
log4js.configure(log4jsConf, {});


var logger = require('log4js').getLogger(consts.LOG.GAME_HTTP);

var game = express.Router();

/**
 * @param app: Pomelo App
 */
module.exports = function (app) {
    game.post('/payment4OSS', function (req, res) {
        logger.debug('payment4OSS  route....');

        //NOTE: 身份验证(线上IP验证)

        //参数
        var paymentData = req.body;

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
    game.use('requestCharge', function (req, res) {
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

    game.get('/', function (req, res) {
        logger.debug('game api root route.');
        res.sendStatus(200);
    });


    return game;
}

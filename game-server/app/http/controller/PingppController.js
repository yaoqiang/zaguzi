var express = require('express');
var qs = require('qs');

var fs = require('fs');

var crypto = require('crypto');

var consts = require('../../consts/consts');

var log4js = require('log4js');
var log4jsConf = require(__dirname + "/../../..//config/log4jsCustom.json");
log4js.configure(log4jsConf, {});


var logger = require('log4js').getLogger(consts.LOG.GAME_HTTP);

var pingpp = express.Router();

/**
 * @param app: Pomelo App
 */
module.exports = function (app) {
    pingpp.use('/notify', function (req, res) {
        logger.debug('responsed from pingxx notify route.');

        // 异步通知
        try {
            // 验证 webhooks 签名
            var verifySignature = function (rawData, signature, pub_key_path) {
                var verifier = crypto.createVerify('RSA-SHA256').update(rawData, "utf8");
                var pub_key = fs.readFileSync(pub_key_path, "utf8");
                return verifier.verify(pub_key, signature, 'base64');
            }

            // POST 原始请求数据是待验签数据，请根据实际情况获取
            var rawData = JSON.stringify(req.body);
            // 签名在头部信息的 x-pingplusplus-signature 字段
            var signature = req.headers['x-pingplusplus-signature'];
            // 请从 https://dashboard.pingxx.com 获取「Webhooks 验证 Ping++ 公钥」
            var pub_key_path = __dirname + "/../../../config/pingpp_rsa_public_key.pem";

            if (!verifySignature(rawData, signature, pub_key_path)) {
                logger.error('验证签名失败, 怀疑可能是非法请求, 或pingpp发送参数错误');
                res.sendStatus(400);
                return;
            }
            logger.debug('verification succeeded for pingxx');

            var result = req.body;
            switch (result.type) {
                case "charge.succeeded":
                    // 开发者在此处加入对支付异步通知的处理代码

                    app.rpc.manager.universalRemote.payment4Pingpp(null, result.data.object, function (data) {
                        logger.debug('处理Pingpp Webhooks的 rpc invoke finished.');
                        res.sendStatus(data.code);
                    });
                    break;
                case "refund.succeeded":
                    // 开发者在此处加入对退款异步通知的处理代码
                    res.sendStatus(200);
                    break;
                default:
                    res.sendStatus(400);
                    break;
            }

        } catch (err) {
            logger.error("处理pingpp webhooks回调时候发生异常 %j", {err: err, req: {header: req.headers, body: req.body}});
            res.sendStatus(500);
        }


    });

    pingpp.get('/', function (req, res) {
        logger.debug('responsed from pingxx root route.');
        res.sendStatus(200);
    });


    return pingpp;
}

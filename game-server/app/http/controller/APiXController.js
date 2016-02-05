var express = require('express');
var qs = require('qs');
var consts = require('../../consts/consts');

var logger = require('pomelo-logger').getLogger(consts.LOG.OPEN_API);

var apix = express.Router();

/**
 * @param app: Pomelo App
 */
module.exports = function (app) {
    apix.get('/pay_phone', function(req, res) {
        logger.debug('responsed from APiX pay_phone route.');
        
        // qs.parser(req.query)
        console.log('-- req --', req);
        var result = req.query;
        
        //如果回调信息不标识失败, 则不处理
        if (result.state == 0 || result.state == 1) {
            res.sendStatus(200);
            return;
        }
        //如果充值失败, 发RPC处理;
        app.rpc.manager.universalRemote.mobileRechargeHandler(null, result, function() {
            logger.debug('处理充值失败rpc invoke finished.');
        });
        
        res.sendStatus(200);
    });

    apix.get('/', function(req, res) {
        logger.debug('responsed from APiX root route.');
        res.sendStatus(200);
    });

    return apix;
}

var shopConf = require('../../config/data/shop');
var appConf = require('../../config/app.json');
var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.PAYMENT);
var Code = require('../../../shared/code');

var Promise = require('promise');

var pingpp = require('pingpp')(appConf.payment.pingxx.testSecretKey);

var exp = module.exports

exp.requestChargesPingxx = function (data, cb) {

    pingpp.charges.create({
        subject: data.subject,
        body: data.body,
        amount: 100,
        order_no: "123456789",
        channel: data.channel,
        currency: "cny",
        client_ip: data.clientIp,
        app: {id: appConf.payment.pingxx.appid}
    }, function(err, charge) {
        // YOUR CODE
    });
}

exp.webhooksPingxx = function () {
    //
}

exp.payment = function (uid, productId, state, device, source) {
    //
}


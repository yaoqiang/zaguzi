var shopConf = require('../../config/data/shop');
var _ = require('lodash');
var pomelo = require('pomelo');

var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.PAYMENT);
var Code = require('../../../shared/code');

var Promise = require('promise');

var pingpp = require('pingpp')('sk_test_ibbTe5jLGCi5rzfH4OqPW9KC');

var exp = module.exports

exp.requestChargesPingxx = function () {
    pingpp.charges.create({
        subject: "Your Subject",
        body: "Your Body",
        amount: 100,
        order_no: "123456789",
        channel: "alipay",
        currency: "cny",
        client_ip: "127.0.0.1",
        app: {id: "app_1Gqj58ynP0mHeX1q"}
    }, function(err, charge) {
        // YOUR CODE
    });
}



exp.payment = function (uid, productId, state, device, from) {

}


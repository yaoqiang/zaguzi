var express = require('express');

var apix = express.Router();

/**
 * @param app: Pomelo App
 */
module.exports = function (app) {
    apix.get('/pay_phone', function(req, res) {
        res.send('responsed from APiX pay_phone route.');
    });

    apix.get('/', function(req, res) {
        res.send('responsed from APiX root route.');
    });
}

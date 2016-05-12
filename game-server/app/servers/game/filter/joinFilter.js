var consts = require('../../../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.GAME);
var pomelo = require('pomelo-rt');

module.exports = function() {
    return new Filter();
}

var Filter = function() {
};

Filter.prototype.before = function (msg, session, next) {

    next();
};

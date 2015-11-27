/**
 * Module dependencies
 */
var util = require('util');
var consts = require('../../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.USER, __filename);
var pomelo = require('pomelo');
var utils = require('../../util/utils');
var underscore = require('underscore');
require('date-utils');

var Entity = require('./entity');


var Properties = function(opts)
{
    Entity.call(this, opts);

    this.uid = opts.uid;
    this.getBankruptcyGrantNr = opts.getBankruptcyGrantNr;
    this.lastCheckIn = opts.lastCheckIn;
    this.continuousCheckInNr = opts.continuousCheckInNr;
    this.getCheckInGrant = opts.getCheckInGrant;
    this.isPayed = opts.isPayed;

}

util.inherits(Properties, Entity);


Properties.prototype.getSignInAward = function (cb) {

}

Properties.prototype.getBankruptAward = function (cb) {

}

Properties.prototype.save = function () {
    this.emit('save')
}

Properties.prototype.flush = function () {
    this.emit('flush')
}


module.exports = Properties;
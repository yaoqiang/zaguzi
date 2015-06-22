/**
 *Module dependencies
 */

var util = require('util');

/**
 * Initialize a new 'User' with the given 'opts'.
 *
 * @param {Object} opts
 * @api public
 */

var User = function(opts) {
    this.id = opts.id;
    this.name = opts.username;
    this.password = opts.password;
    this.loginCount = opts.loginCount;
    this.from = opts.from || '';
    this.lastLoginTime = opts.lastLoginTime;
    this.mobile = opts.mobile;

};

/**
 * Expose 'Entity' constructor
 */

module.exports = User;
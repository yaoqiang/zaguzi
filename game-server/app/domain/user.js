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
    this.from = opts.from || '';
    this.password = opts.password;
    this.loginCount = opts.login_count;
    this.lastLoginTime = opts.last_login_time;
};

/**
 * Expose 'Entity' constructor
 */

module.exports = User;
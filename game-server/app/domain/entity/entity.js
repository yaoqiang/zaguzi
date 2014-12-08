/**
 * Module dependencies
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var id = 1;

/**
 * Initialize a new 'Entity' with the given 'opts'.
 * Entity inherits EventEmitter
 *
 * @param {Object} opts
 * @api public
 */

var Entity = function(opts) {
    EventEmitter.call(this);
    this.entityId = id++;
};

util.inherits(Entity, EventEmitter);

/**
 * Expose 'Entity' constructor
 */

module.exports = Entity;

/**
 * Get entityId
 *
 * @return {Number}
 * @api public
 */

Entity.prototype.getEntityId = function() {
    return this.entityId;
};


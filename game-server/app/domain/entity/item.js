/**
 * Module dependencies
 */
var util = require('util');
var Entity = require('./entity');

/**
 * Initialize a new 'Item' with the given 'opts'.
 * Item inherits Entity
 *
 * @param {Object} opts
 * @api public
 */
var Item = function(opts) {
    Entity.call(this, opts);

    this.id = opts.id;


};

util.inherits(Item, Entity);

/**
 * Expose 'Item' constructor.
 */
module.exports = Item;

/**
 * Item refresh every 'lifetime' millisecond
 *
 * @api public
 */
Item.prototype.update = function(){
    var next = Date.now();
    this.lifetime -= (next - this.time);
    this.time = next;
    if(this.lifetime <= 0) {
        this.died = true;
    }
};

Item.prototype.toJSON = function() {
    return {

    };
};

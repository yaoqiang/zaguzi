var mongojs = require('mongojs');
var consts = require('../../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.SYNC);

module.exports = {
    update: function(dbclient, val, cb) {
        logger.debug('#execute itemSync.update');
        dbclient.player.findAndModify({
            query: {uid: mongojs.ObjectId(val.uid)},
            update: {
                $set: {
                    items: val.items
                }
            }
        }, function(err, doc, lastErrorObject) {
            if (err) {
                console.error(err)
                console.error('write player items data to db failed! ' + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    }
};

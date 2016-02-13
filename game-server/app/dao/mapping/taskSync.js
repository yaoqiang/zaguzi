var mongojs = require('mongojs');
var consts = require('../../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.SYNC);

module.exports = {
    update: function(dbclient, val, cb) {
        logger.debug('#execute taskSync.update');
        dbclient.player.findAndModify({
            query: {uid: mongojs.ObjectId(val.uid)},
            update: {
                $set: {
                    tasks: val.tasks
                }
            }
        }, function(err, doc, lastErrorObject) {
            if (err) {
                console.error(err)
                console.error('write player tasks data to db failed! ' + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    }
};

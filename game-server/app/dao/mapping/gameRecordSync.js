var mongojs = require('mongojs');
var consts = require('../../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.SYNC);

module.exports = {
    insert: function(dbclient, val, cb) {
        logger.debug('#execute gameRecordSync.insert');
        
        dbclient.gameRecord.save(val, function(err, doc) {
            if (err) {
                logger.error('write gameRecord data to db failed! ' + JSON.stringify(val) + ': %o', err);
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    }
};

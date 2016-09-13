var mongojs = require('mongojs');
var consts = require('../../consts/consts');
var logger = require('log4js').getLogger(consts.LOG.SYNC);

module.exports = {
    insert: function(dbclient, val, cb) {
        logger.debug('#execute lotteryRecordSync.insert');
        
        dbclient.lotteryRecord.save(val, function(err, doc) {
            if (err) {
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    }
};

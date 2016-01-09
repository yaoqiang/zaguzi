var mongojs = require('mongojs');
var logger = require('pomelo-logger').getLogger('sync');

module.exports = {
    insert: function(dbclient, val, cb) {
        logger.debug('#execute gameRecordSync.insert');
        
        dbclient.gameRecord.save(val, function(err, doc) {
            if (err) {
                console.error(err)
                console.error('write gameRecord data to db failed! ' + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    }
};

var mongojs = require('mongojs');

module.exports = {
    update: function (dbclient, val, cb) {

        dbclient.player.findAndModify({
            query: { uid: mongojs.ObjectId(val.uid) },
            update: {
                $set: {
                    properties: val.properties
                }
            }
        }, function (err, doc, lastErrorObject) {
            if (err) {
                console.error(err)
                console.error('write player data to db failed! ' + JSON.stringify(val));
            }
            if (!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    }
};

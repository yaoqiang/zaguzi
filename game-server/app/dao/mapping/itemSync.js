module.exports = {
    updateItem: function(dbclient, val, cb) {
        var sql = 'update properties set itemJson = ? where userId = ?';
        var itemData = val.itemData;
        if (typeof itemData !== 'string') {
            itemData = JSON.stringify(itemData);
        }
        var args = [itemData, val.id];
        dbclient.query(sql, args, function(err, res) {
            if (err) {
                console.error('write mysql failed! ' + sql + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    }
};
module.exports = {
    update: function(dbclient, val, cb) {
        var sql = 'update properties set lastLogin = ?, getBankruptNr = ?, continuousLoginNr = ?, isGetContinuousLogin = ?, isFirstPay = ?, taskJson = ?, itemJson = ? where userId = ?';
        var args = [val.lastLogin, val.getBankruptNr, val.continuousLoginNr, val.isGetContinuousLogin, val.isFirstPay, JSON.stringify(val.taskJson), JSON.stringify(val.itemJson), val.id];
        dbclient.query(sql, args, function(err, res) {
            if (err) {
                console.error(err);
                console.error('write player properties to mysql failed! ' + sql + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    }
};

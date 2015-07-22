module.exports = {
    update: function(dbclient, val, cb) {
        var sql = 'update player set gold = ?, winNr = ?, loseNr = ?, tieNr = ?, rank = ?, exp = ?, fragment = ? where userId = ?';

        var args = [val.gold, val.winNr, val.loseNr, val.tieNr, val.rank, val.exp, val.fragment, val.id];
        console.log('args = ', args);
        dbclient.query(sql, args, function(err, res) {
            if (err) {
                console.error(err)
                console.error('write player to mysql failed! ' + sql + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    },
    updatePlayerProfile: function(dbclient, val, cb) {
        var sql = 'update player set nickName = ?, avatar = ? where userId = ?';

        var args = [val.nickName, val.avatar, val.id];
        dbclient.query(sql, args, function(err, res) {
            if (err) {
                console.error('write player profile mysql failed! ' + sql + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    },
    updateGold: function (dbclient, val, cb) {
        var sql = 'update player set gold = ? where userId = ?';
        var args = [val.gold, val.id];
        dbclient.query(sql, args, function(err, res) {
            if (err) {
                console.error('write mysql failed! ' + sql + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    },
    updateWinNr: function (dbclient, val, cb) {
        var sql = 'update player set winNr = ? where userId = ?';
        var args = [val.winNr, val.id];
        dbclient.query(sql, args, function(err, res) {
            if (err) {
                console.error('write mysql failed! ' + sql + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    },
    updateLoseNr: function (dbclient, val, cb) {
        var sql = 'update player set loseNr = ? where userId = ?';
        var args = [val.loseNr, val.id];
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

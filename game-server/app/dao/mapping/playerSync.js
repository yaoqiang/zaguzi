module.exports = {
    update: function(dbclient, val, cb) {

        dbclient.player.findAndModify({
            query: {uid: val.id},
            update: {
                $set: {
                    gold: val.gold,
                    winNr: val.winNr,
                    loseNr: val.loseNr,
                    tieNr: val.tieNr,
                    rank: val.rank,
                    exp: val.exp,
                    fragment: val.fragment
                }
            }
        }, function(err, doc, lastErrorObject) {
            if (err) {
                console.error(err)
                console.error('write player data to db failed! ' + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
        
    },
    updatePlayerProfile: function(dbclient, val, cb) {

        dbclient.player.findAndModify({
            query: {uid: val.id},
            update: {
                $set: {
                    nickName: val.nickName,
                    avatar: val.avatar
                }
            }
        }, function(err, doc, lastErrorObject) {
            if (err) {
                console.error(err)
                console.error('write player profile data to db failed! ' + JSON.stringify(val));
            }
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    }
};

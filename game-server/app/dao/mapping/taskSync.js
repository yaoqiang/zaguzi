module.exports = {
    updateTask: function(dbclient, val, cb) {
        var sql = 'update properties set taskJson = ? where userId = ?';
        var taskData = val.taskData;
        if (typeof taskData !== 'string') {
            taskData = JSON.stringify(taskData);
        }
        var args = [taskData, val.id];
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

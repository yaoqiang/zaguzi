//nodejs执行, for test

var mongojs = require('mongojs');

var Promise = require('promise');

var request = require('request');

var _ = require('lodash');

var db = mongojs('zgz', ['rankingList', 'activityList', 'activityGrantRecord']);

var moment = require('moment');


//测试查询上月股神排行榜获奖记录
var firstDayInMonth = moment().startOf('month').format('YYYY-MM-DD HH:mm:ss');
db.activityGrantRecord.find({name: "GOD_MONTH", createdAt: {$gt: new Date(firstDayInMonth)}}).sort({'detail.rank': 1}, function(err, docs) {
    if (err) {
        console.log(err);
        db.close();
        process.exit();
        return;
    }
    var getRecordDetialPromiseList = _.map(docs, function(record) {
        return new Promise(function(resolve, reject) {
            db.player.findOne({uid: mongojs.ObjectId(record.uid)}, function(err, player) {
                db.user.findOne({_id:  mongojs.ObjectId(record.uid)}, function(err, user) {
                    record.mobile = user.mobile || '';
                    record.nickName = player.nickName;
                    resolve(record);
                });
            })
        });
    });

    Promise.all(getRecordDetialPromiseList).then(function(res) {
        console.log('res -> ', res)
        db.close();
        process.exit();
    })
});


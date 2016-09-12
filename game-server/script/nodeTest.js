//nodejs执行, for test

var mongojs = require('mongojs');

var Promise = require('promise');

var request = require('request');

var _ = require('lodash');

var db = mongojs('zgz', ['rankingList', 'activityList', 'activityGrantRecord', 'user', 'player']);

var moment = require('moment');


//测试查询上月股神排行榜获奖记录
//每月第一天凌晨1点生成上月股神排行榜的奖励记录，所以查询日期大于本月第一天的就可查到上月记录；即查询上月奖励接口延迟1小时。
// var firstDayInMonth = moment().startOf('month').format('YYYY-MM-DD HH:mm:ss');
// db.activityGrantRecord.find({name: "GOD_MONTH", createdAt: {$gt: new Date(firstDayInMonth)}}).sort({'detail.rank': 1}, function(err, docs) {
//     if (err) {
//         console.log(err);
//         db.close();
//         process.exit();
//         return;
//     }
//     var getRecordDetailPromiseList = _.map(docs, function(record) {
//         return new Promise(function(resolve, reject) {
//             db.player.findOne({uid: mongojs.ObjectId(record.uid)}, function(err, player) {
//                 db.user.findOne({_id:  mongojs.ObjectId(record.uid)}, function(err, user) {
//                     record.mobile = user.mobile || '';
//                     record.nickName = player.nickName;
//                     resolve(record);
//                 });
//             })
//         });
//     });

//     Promise.all(getRecordDetailPromiseList).then(function(res) {
//         console.log('res -> ', res)
//         db.close();
//         process.exit();
//     })
// });


var now = moment();
var from = moment(now).subtract(1,'months').endOf('month').format('YYYY-MM-DD HH:mm:ss');
console.log(from);
//nodejs执行, 每天执行, 删除不需要存储的数据

var mongojs = require('mongojs');

var Promise = require('promise');

var db = require('../app/dao/mongodb');

var moment = require('moment');

var now = moment();

var lastMonth = moment(now).subtract(1,'months').endOf('month').format('YYYY-MM-DD HH:mm:ss');
var lastSevenDay = moment(now).subtract(7, 'days').endOf('day').format('YYYY-MM-DD HH:mm:ss');



new Promise(function (resolve, reject) {
    //删除上月的用户牌局记录
    db.userBattleRecord.remove({createdAt: {$gt: lastMonth}}, function() {
        console.log('remove last month userBattleRecord finished...');
        resolve();  
    })
})
.then(function (resolve, reject) {
    //删除创建时间为7天前的数据, 用户日志只保留7天。
    db.logUserRecord.remove({createdAt: {$lte: lastSevenDay}}, function() {
        console.log('remove last 7 day logUserRecord finished...');
        process.exit();
    })
})
.done();

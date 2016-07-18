//nodejs执行, 每天执行, 删除不需要存储的数据

var mongojs = require('mongojs');

var Promise = require('promise');

var db = require('../app/dao/mongodb');

var moment = require('moment');

var now = moment();

var lastMonth = moment(now).subtract(1,'months').endOf('month').format('YYYY-MM-DD HH:mm:ss');
var lastTwoWeek = moment(now).subtract(14, 'days').endOf('day').format('YYYY-MM-DD HH:mm:ss');


new Promise(function (resolve, reject) {
    //删除上月的用户牌局记录
    db.userBattleRecord.remove({createdAt: {$lte: new Date(lastMonth)}}, function() {
        console.log('remove userBattleRecord finished with the createdAt before last month...');
        resolve();  
    })
})
.then(function (resolve, reject) {
    //删除创建时间为7天前的数据, 用户日志只保留7天。
    db.logUserRecord.remove({createdAt: {$lte: new Date(lastTwoWeek)}}, false, function() {
        console.log('remove logUserRecord finished with the createdAt before last two weeks...');
        process.exit();
    })
})
.done();

//nodejs执行, 每天执行, 删除不需要存储的数据

var mongojs = require('mongojs');

var Promise = require('promise');

var db = mongojs('zgz', ['userBattleRecord', 'logUserRecord']);

var moment = require('moment');

var now = moment();

var lastTwoMonth = moment(now).subtract(2,'months').endOf('month').format('YYYY-MM-DD HH:mm:ss');
var lastTwoWeek = moment(now).subtract(14, 'days').endOf('day').format('YYYY-MM-DD HH:mm:ss');



new Promise(function (resolve, reject) {
    //删除上月之前的用户牌局记录（多保留前一个月的记录）
    db.userBattleRecord.remove({createdAt: {$lte: new Date(lastTwoMonth)}}, function() {
        console.log('remove userBattleRecord finished with the createdAt before last month...', new Date());
        resolve();  
    })
})
.then(function (resolve, reject) {
    //删除创建时间为7天前的数据, 用户日志只保留14天。
    db.logUserRecord.remove({createdAt: {$lte: new Date(lastTwoWeek)}}, false, function() {
        console.log('remove logUserRecord finished with the createdAt before last two weeks...', new Date());
        db.close();
        process.exit();
    })
})
.done();

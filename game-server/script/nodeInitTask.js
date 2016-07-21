//nodejs执行, 重新初始化玩家任务数据. 为V1.3;

var mongojs = require('mongojs');

var Promise = require('promise');

var db = mongojs('zgz', ['player']);

var taskUtil = require('../app/domain/entity/task');

var taskList = taskUtil.initTasks();


db.player.update({}, {$set: {tasks: taskList}}, {multi: true}, function() {
    console.log('init finished...');
    db.close()
    process.exit();
})

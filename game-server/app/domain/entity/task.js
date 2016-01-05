var _ = require('underscore');

var taskConf = require('../../../config/data/task');

var taskUtil = module.exports;

taskUtil.initTasks = function () {
  return {daily: this.initDailyTasks(), forever: this.initForeverTasks()};
}

taskUtil.initDailyTasks = function () {
  return _.map(taskConf.daily, function (group) {
    var task = _.first(group.tasks);
    return {
      id: task.id,
      name: task.name,
      desc: task.desc,
      target: task.target,
      icon: task.icon,
      grant: task.grant,
      current: 0,
      roomId: task.roomId,
      type: task.type,
      finished: false
    };
  });
}

taskUtil.initForeverTasks = function () {
  return _.map(taskConf.forever, function (group) {
    var task = _.first(group.tasks);
    return {
      id: task.id,
      name: task.name,
      desc: task.desc,
      target: task.target,
      icon: task.icon,
      grant: task.grant,
      current: 0,
      roomId: task.roomId,
      type: task.type,
      finished: false
    };
  });
}

taskUtil.getNextTask = function (taskId, cb) {

  //每日任务
  if (taskId < 200000) {
    var parallelDailyTaskConf = _.flatten(_.map(taskConf.daily, function(group) {
      return group.tasks;
    }));
    var dailyTask = _.findWhere(parallelDailyTaskConf, {id: taskId});
    dailyTask.finished = true;
    cb({taskConf: dailyTask});
    return;
  }

  var parallelTaskConf = _.flatten(_.map(taskConf.forever, function(group) {
    return group.tasks;
  }));

  var currentTaskConf = _.findWhere(parallelTaskConf, {id: taskId});

  //如果是元宝任务, 则clear后继续返回
  if (taskId > 400000) {
    currentTaskConf.finished = false;
    cb({taskConf: currentTaskConf});
    return;
  }

  var index = _.findLastIndex(parallelTaskConf, {id: taskId});

  if (parallelTaskConf.length > index) {
    var nextTask = parallelTaskConf[index+1];
    //如果还有后续系列任务, 则返回后续任务; 如果没有, 则返回当前任务, 标识系列任务结束.
    if (nextTask.id.toString().substr(0, 4) == taskId.toString().substr(0, 4) ) {
      nextTask.finished = false;
      cb({taskConf: nextTask});
    }
    else {
      currentTaskConf.finished = true;
      cb({taskConf: currentTaskConf});
    }
  }
}


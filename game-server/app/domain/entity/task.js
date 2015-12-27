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
      finished: false
    };
  });
}

taskUtil.getNextTask = function (taskId, cb) {

  var parallelTaskConf = _.flatten(_.map(taskConf.forever, function(group) {
    return group.tasks;
  }));

  var currentTaskConf = _.findWhere(parallelTaskConf, {id: taskId});

  //如果是元宝任务, 则clear后继续返回
  if (taskId > 400000) {
    cb({taskConf: currentTaskConf, finished: false});
  }

  var index = _.findLastIndex(parallelTaskConf, {id: taskId});

  if (parallelTaskConf.length > index) {
    var nextTask = parallelTaskConf[index+1];
    //如果还有后续系列任务, 则返回后续任务; 如果没有, 则返回当前任务, 标识系列任务结束.
    if (nextTask.id.substr(0, 4) == taskId.substr(0, 4) ) {
      cb({taskConf: nextTask, finished: false});
    }
    else {
      cb({taskConf: currentTaskConf, finished: true});
    }
  }
}


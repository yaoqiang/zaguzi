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
      current: 0
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
      current: 0
    };
  });
}
var db = connect('zgz');

var originalIngotTaskData = db.ingotTaskBackup.find();

originalIngotTaskData.forEach(function (item) {
    db.player.update({uid: item.uid, 'tasks.forever': {$elemMatch: {id: 400101}}}, {$set: {'tasks.forever.$.current': item.current}});
})

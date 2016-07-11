var db = connect('zgz');

var list = db.ingotTaskBackup.find();

list.forEach(function (item) {
    db.player.update({uid: ObjectId(item.uid), 'tasks.forever': {$elemMatch: {id: 400101}}}, {$set: {'tasks.forever.$.current': item.current}});
})

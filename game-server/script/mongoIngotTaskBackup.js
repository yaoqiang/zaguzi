var db = connect('zgz');

var playerList = db.player.find();

playerList.forEach(function (p) {
    var data = {};
    data.uid = p.uid;
    var foreverTaskList = p.tasks.forever;
    var count = 0;
    foreverTaskList.forEach(function (task) {
        if (task.id === 400101) {
            count += task.current;
        }
        if (task.id === 400201) {
            count += task.current*2;
        }
    })
    data.current = count;

    if (data.current === 0) return;
    
    db.ingotTaskBackup.save(data);

});

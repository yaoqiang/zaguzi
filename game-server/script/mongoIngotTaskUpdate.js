var db = connect('zgz');

var playerList = db.player.find();

//在元宝场增加5000底注5人局房间，为玩家任务数据增加房间ID
playerList.forEach(function (p) {
    db.player.update({ 'uid' : p.uid, 'tasks.forever': {$elemMatch: {id: 400101}} }, {$push: {'tasks.forever.$.roomId': 14}});
})

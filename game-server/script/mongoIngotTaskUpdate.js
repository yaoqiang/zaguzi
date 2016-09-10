var db = connect('zgz');

var playerList = db.player.find();

//在元宝场增加5000底注5人局房间，为玩家任务数据增加房间ID
playerList.forEach(function (p) {
    db.player.update({ 'uid' : p.uid, 'tasks.forever': {$elemMatch: {id: 400101}} }, {$set: {'tasks.forever.$.name': '赢元宝', 'tasks.forever.$.desc': '在元宝场1000底注赢30把，可获得1枚元宝'}});
    db.player.update({ 'uid' : p.uid }, {$push: {'tasks.forever': {
        "id" : 400201,
        "name" : "赢元宝 - 快速",
        "desc" : "在元宝场5000底注赢15把，可获得1枚元宝",
        "target" : 15,
        "icon" : "",
        "grant" : 0,
        "fragment" : 1,
        "current" : 0,
        "roomId" : [
            14,
            24,
            34
        ],
        "type" : "win",
        "finished" : false
    }}});

})


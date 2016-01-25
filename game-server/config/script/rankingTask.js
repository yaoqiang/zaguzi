var db = connect('zgz');

var rankingList = db.rankingList;

//上榜临界值
var goldThreshold = 0, battleThreshold = 0, rechargeThreshold = 0;
var limit = 20;


//财富榜
db.player.aggregate([
    { $project: { _id: 0, nickName: 1, avatar: 1, gold: 1, uid: 1, type: { $literal: "RICH" }, date:  { $literal: new Date() } }},
    { $match : { gold: { $gt: goldThreshold } } },
    { $sort:  { gold: -1 }},
    { $limit: limit },
    { $out: "rankingList" }
]);

//股神榜
db.player.aggregate([
    { $project: { _id: 0, nickName: 1, avatar: 1, uid: 1,
    winning: {
        $devide: ["$winNr", { $add: ["$winNr", "$loseNr"] }]
    },
    battleCount: { $add: ["$winNr", "$loseNr"] }, type: { $literal: "GOD" }, date:  { $literal: new Date() } }},
    { $match : { battleCount: { $gt: battleThreshold } } },
    { $sort:  { winning: -1 }},
    { $limit: limit },
    { $out: "rankingList" }
]);


//昨日充值榜


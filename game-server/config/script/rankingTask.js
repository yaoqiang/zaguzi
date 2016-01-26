var db = connect('zgz');

var rankingList = db.rankingList;

//上榜临界值
var goldThreshold = 0, battleThreshold = 0, rechargeThreshold = 0;
var limit = 20;


//财富榜
var richRankingList = db.player.aggregate([
    { $project: { _id: 0, nickName: 1, avatar: 1, gold: 1, uid: 1 }},
    { $match : { gold: { $gt: goldThreshold } } },
    { $sort:  { gold: -1 }},
    { $limit: limit }
]);

rankingList.insert({ ranking: richRankingList._batch, type: "RICH", date: new Date() });

//股神榜
var godRankingList = db.player.aggregate([
    {
        $project: {
            _id: 0, nickName: 1, avatar: 1, uid: 1, winNr: 1, loseNr: 1,
            battleCount: {$add: ["$winNr", "$loseNr"]},
            winning: {
                $divide: ["$winNr", {$cond: [{$eq: [{ $add: ["$winNr", "$loseNr"] }, 0]}, 1, {$add: ["$winNr", "$loseNr"]}]}]
            }
        }
    },
    {$match: {battleCount: {$gt: battleThreshold}}},
    {$sort: {winning: -1}},
    {$limit: limit}
]);

rankingList.insert({ ranking: godRankingList._batch, type: "GOD", date: new Date() });


//昨日充值榜


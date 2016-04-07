var db = connect('zgz');

var rankingList = db.rankingList;

//上榜临界值
var goldThreshold = 100000, battleThreshold = 100, rechargeThreshold = 100;
var limit = 20;
var yesterday = new Date((new Date()) - 24*60*60*1000);


//财富榜
var richRankingList = db.player.aggregate([
    { $project: { _id: 0, nickName: 1, avatar: 1, gold: 1, uid: 1, summary: 1 }},
    { $match : { gold: { $gt: goldThreshold } } },
    { $sort:  { gold: -1 }},
    { $limit: limit }
]);

rankingList.insert({ ranking: richRankingList._batch, type: "RICH", date: new Date() });

//股神榜
var godRankingList = db.player.aggregate([
    {
        $project: {
            _id: 0, nickName: 1, avatar: 1, uid: 1, winNr: 1, loseNr: 1, summary: 1,
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



//历史充值榜
var rechargeList = db.order.aggregate([
        { $match: { state: 'FINISHED' } },
        { $group: 
            {
                _id: "$uid",
                totalAmount: {$sum: "$amount"},
                nickName: {$first: "$player.nickName"},
                avatar: {$first: "$player.avatar"},
                summary: {$first: "$player.summary"}
            }
        },
        {$sort: {totalAmount: -1}},
        {$limit: limit}
]);

var rechargeRankingResult = [];
if (rechargeList._batch && rechargeList._batch.length > 0) {
    rechargeList._batch.forEach(function (item) {
        var player = db.player.findOne({uid: ObjectId(item._id)});
        if (player) {
            item.nickName = player.nickName;
            item.avatar = player.avatar;
            item.summary = player.summary;
            rechargeRankingResult.push(item);
        }
    });
}


rankingList.insert({ ranking: rechargeRankingResult, type: "RECHARGE", date: new Date() });

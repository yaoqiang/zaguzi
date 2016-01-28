var db = connect('zgz');

var rankingList = db.rankingList;

//上榜临界值
var goldThreshold = 0, battleThreshold = 0, rechargeThreshold = 0;
var limit = 20;
var yesterday = new Date((new Date()) - 24*60*60*1000);


//财富榜
var richRankingList = db.player.aggregate([
    { $match : { gold: { $gt: goldThreshold } } },
    { $project: { _id: 0, nickName: 1, avatar: 1, gold: 1, uid: 1 }},
    { $sort:  { gold: -1 }},
    { $limit: limit }
]);

rankingList.insert({ ranking: richRankingList._batch, type: "RICH", date: new Date() });

//股神榜
var godRankingList = db.player.aggregate([
    {$match: {battleCount: {$gt: battleThreshold}}},
    {
        $project: {
            _id: 0, nickName: 1, avatar: 1, uid: 1, winNr: 1, loseNr: 1,
            battleCount: {$add: ["$winNr", "$loseNr"]},
            winning: {
                $divide: ["$winNr", {$cond: [{$eq: [{ $add: ["$winNr", "$loseNr"] }, 0]}, 1, {$add: ["$winNr", "$loseNr"]}]}]
            }
        }
    },
    {$sort: {winning: -1}},
    {$limit: limit}
]);

rankingList.insert({ ranking: godRankingList._batch, type: "GOD", date: new Date() });


// db.order.remove({});

// db.order.save({uid: 1, orderSerialNumber: 1, productId: 1, amount: 1, state: 1, device: 1, channel: 1, createdAt: new Date()});
// db.order.save({uid: 1, orderSerialNumber: 1, productId: 1, amount: 2, state: 1, device: 1, channel: 1, createdAt: new Date()});
// db.order.save({uid: 1, orderSerialNumber: 1, productId: 1, amount: 3, state: 1, device: 1, channel: 1, createdAt: new Date()});
// db.order.save({uid: 2, orderSerialNumber: 1, productId: 1, amount: 4, state: 1, device: 1, channel: 1, createdAt: new Date()});
// db.order.save({uid: 2, orderSerialNumber: 1, productId: 1, amount: 4, state: 1, device: 1, channel: 1, createdAt: new Date()});
// db.order.save({uid: 2, orderSerialNumber: 1, productId: 1, amount: 4, state: 1, device: 1, channel: 1, createdAt: new Date()});
// db.order.save({uid: 2, orderSerialNumber: 1, productId: 1, amount: 4, state: 1, device: 1, channel: 1, createdAt: new Date()});
// db.order.save({uid: 2, orderSerialNumber: 1, productId: 1, amount: 4, state: 1, device: 1, channel: 1, createdAt: new Date()});
// db.order.save({uid: 3, orderSerialNumber: 1, productId: 1, amount: 1, state: 1, device: 1, channel: 1, createdAt: new Date()});
// db.order.save({uid: 3, orderSerialNumber: 1, productId: 1, amount: 1, state: 1, device: 1, channel: 1, createdAt: new Date()});
// db.order.save({uid: 3, orderSerialNumber: 1, productId: 1, amount: 1, state: 1, device: 1, channel: 1, createdAt: new Date()});


//昨日充值榜
var getRechargeList = db.order.aggregate([
        { $match: { createdAt: { $gt: yesterday } } },    
        { $group: 
            {
                _id: "$uid",
                totalAmount: {$sum: "$amount"},
                nickName: {$first: "$player.nickName"},
                avatar: {$first: "$player.avatar"}
            }
        },
        {$sort: {totalAmount: -1}},
        {$limit: limit}
]);


rankingList.insert({ ranking: getRechargeList._firstBatch, type: "RECHARGE", date: new Date() });
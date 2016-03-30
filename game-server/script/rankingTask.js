var db = connect('zgz');

var rankingList = db.rankingList;

//上榜临界值
var goldThreshold = 0, battleThreshold = 0, rechargeThreshold = 0;
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


// db.order.remove({});

 //db.order.save({uid: '56927ea3cba744a3428a1f52', orderSerialNumber: 1, productId: 1, amount: 1, state: 1, device: 1, channel: 1, player: {nickName: 'a', avatar: 0}, createdAt: new Date()});
 //db.order.save({uid: '56927ea3cba744a3428a1f52', orderSerialNumber: 2, productId: 2, amount: 2, state: 1, device: 1, channel: 1, player: {nickName: 'a', avatar: 0}, createdAt: new Date()});
 //db.order.save({uid: '56927ea3cba744a3428a1f52', orderSerialNumber: 3, productId: 1, amount: 3, state: 1, device: 1, channel: 1, player: {nickName: 'a', avatar: 0}, createdAt: new Date()});
 //db.order.save({uid: '56927ea3cba744a3428a1f53', orderSerialNumber: 4, productId: 1, amount: 4, state: 1, device: 1, channel: 1, player: {nickName: 'b', avatar: 0}, createdAt: new Date()});
 //db.order.save({uid: '56927ea3cba744a3428a1f53', orderSerialNumber: 5, productId: 3, amount: 4, state: 1, device: 1, channel: 1, player: {nickName: 'b', avatar: 0}, createdAt: new Date()});
 //db.order.save({uid: '56927ea3cba744a3428a1f53', orderSerialNumber: 6, productId: 1, amount: 4, state: 1, device: 1, channel: 1, player: {nickName: 'b', avatar: 0}, createdAt: new Date()});
 //db.order.save({uid: '56927ea3cba744a3428a1f53', orderSerialNumber: 7, productId: 1, amount: 4, state: 1, device: 1, channel: 1, player: {nickName: 'b', avatar: 0}, createdAt: new Date()});
 //db.order.save({uid: '56927ea3cba744a3428a1f53', orderSerialNumber: 8, productId: 1, amount: 4, state: 1, device: 1, channel: 1, player: {nickName: 'b', avatar: 0}, createdAt: new Date()});
 //db.order.save({uid: '56927ea3cba744a3428a1f54', orderSerialNumber: 9, productId: 4, amount: 1, state: 1, device: 1, channel: 1, player: {nickName: 'c', avatar: 4}, createdAt: new Date()});
 //db.order.save({uid: '56927ea3cba744a3428a1f54', orderSerialNumber: 10, productId: 1, amount: 1, state: 1, device: 1, channel: 1, player: {nickName: 'c', avatar: 4}, createdAt: new Date()});
 //db.order.save({uid: '56927ea3cba744a3428a1f54', orderSerialNumber: 11, productId: 4, amount: 1, state: 1, device: 1, channel: 1, player: {nickName: 'c', avatar: 4}, createdAt: new Date()});


//昨日充值榜
var getRechargeList = db.order.aggregate([
        { $match: { createdAt: { $gt: yesterday }, state: 'FINISHED' } },
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


rankingList.insert({ ranking: getRechargeList._batch, type: "RECHARGE", date: new Date() });
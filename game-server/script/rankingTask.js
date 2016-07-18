var db = connect('zgz');

var rankingList = db.rankingList;

//helper
var getDayOfMonth = function (y, Mm) {  
    
    if (typeof y == 'undefined') { y = (new Date()).getFullYear(); }  
    if (typeof Mm == 'undefined') { Mm = (new Date()).getMonth(); }  
    var Feb = (y % 4 == 0) ? 29 : 28;  
    var aM = new Array(31, Feb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);  
    return  aM[Mm];  
}; 

var getDateOfPreMonth = function (dt) {  
    
    if (typeof dt == 'undefined') { dt = (new Date()); }  
    var y = (dt.getMonth() == 0) ? (dt.getFullYear() - 1) : dt.getFullYear();  
    var m = (dt.getMonth() == 0) ? 11 : dt.getMonth() - 1;  
    var preM = getDayOfMonth(y, m);
    var d = (preM < dt.getDate()) ? preM : dt.getDate();  
    return new Date(y, m, d);
};  

var getLastDayInLastMonth = function (dt) {
    var lastMonth = getDateOfPreMonth(dt);
    lastMonth.setMonth(dt.getMonth());
    lastMonth.setDate(0);
    lastMonth.setHours(23);
    lastMonth.setMinutes(59);
    lastMonth.setSeconds(59);
    return lastMonth;
}


//上榜临界值
var goldThreshold = 0, battleThreshold = 100, rechargeThreshold = 100, godMonthBattleThreshold = 0;
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


var from = getLastDayInLastMonth(new Date());
//股神榜月排行
var godMonthRankingList = db.userBattleRecord.aggregate([
        { $match: { createdAt: {$gt: from} } },
        { $group:
            {
                _id: "$uid",
                battleCount: {$sum: 1},
                winNr: {
                    $sum: { $cond: [ {  $eq: [ '$result' , 'WIN' ] }, 1, 0 ] }
                },
                loseNr: {
                    $sum: { $cond: [ {  $eq: [ '$result' , 'LOSE' ] }, 1, 0 ] }
                },
            }
        },
        { $match: { battleCount: {$gt: godMonthBattleThreshold} }},
        { 
            $project: {
                _id: 1, battleCount: 1, winNr: 1, loseNr: 1,
                winning: {
                    $divide: ["$winNr", {$cond: [{$eq: [{ $add: ["$winNr", "$loseNr"] }, 0]}, 1, {$add: ["$winNr", "$loseNr"]}]}]
                } 
            }
        },
        {$sort: {winning: -1}},
        {$limit: limit}
]);

var godMonthRankingResult = [];

if (godMonthRankingList && godMonthRankingList._batch.length > 0) {
    godMonthRankingList._batch.forEach(function (item) {
        var player = db.player.findOne({uid: ObjectId(item._id)});
        item.nickName = player.nickName;
        item.avatar = player.avatar;
        item.summary = player.summary;
        godMonthRankingResult.push(item);
    });
}

rankingList.insert({ ranking: godMonthRankingResult, type: "GOD_MONTH", date: new Date() });

db.tmpRanking.save({ranking: godMonthRankingList._batch})


//历史充值榜
var rechargeList = db.order.aggregate([
        { $match: { state: 'FINISHED' } },
        { $group:
            {
                _id: "$uid",
                totalAmount: {$sum: "$amount"}
            }
        },
        {$sort: {totalAmount: -1}},
        {$limit: limit}
]);

var rechargeRankingResult = [];

if (rechargeList && rechargeList._batch.length > 0) {
    rechargeList._batch.forEach(function (item) {
        //用户要求不要上榜..
        if (item._id == '5743bc82a01f604f6ee433e6') return;
        var player = db.player.findOne({uid: ObjectId(item._id)});
        item.nickName = player.nickName;
        item.avatar = player.avatar;
        item.summary = player.summary;
        rechargeRankingResult.push(item);
    });
}

rankingList.insert({ ranking: rechargeRankingResult, type: "RECHARGE", date: new Date() });





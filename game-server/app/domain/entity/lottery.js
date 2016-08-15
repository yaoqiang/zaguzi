var _ = require('lodash');

var lotteryJson = require('../../../config/data/lottery');

var Item = function (id, summary, icon, fragment, gold, items, probability) {
    this.id = params.id;
    this.summary = params.summary;
    this.icon = params.icon;
    this.fragment = params.fragment;
    this.gold = params.gold;
    this.items = params.items;
    this.probability = params.probability;
}


var Lottery = Lottery || {};

Lottery.lottery = function (orignalRates) {
    if (orignalRates == null || orignalRates.length == 0) {
        return -1;
    }

    var size = orignalRates.length;

    // 计算总概率，这样可以保证不一定总概率是1
    var sumRate = 0;
    orignalRates.forEach(function (rate) {
        sumRate += rate;
    })

    // 计算每个物品在总概率的基础下的概率情况
    var sortOrignalRates = [];
    var tempSumRate = 0;

    orignalRates.forEach(function (rate) {
        tempSumRate += rate;
        sortOrignalRates.push(tempSumRate / sumRate);
    })


    // 根据区块值来获取抽取到的物品索引
    var nextDouble = Math.random();
    sortOrignalRates.push(nextDouble);
    sortOrignalRates = _.sortBy(sortOrignalRates);

    return sortOrignalRates.indexOf(nextDouble);
}

Lottery.get = function () {
    var orignalRates = [];
    lotteryJson.forEach(function (item) {
        var probability = item.probability;
        if (probability < 0) {
            probability = 0;
        }
        orignalRates.push(probability);
    });

    var orignalIndex = Lottery.lottery(orignalRates);

    return lotteryJson[orignalIndex];
}

// console.log(Lottery.get());

//-----------------------
//-- for test
//-----------------------

// var count1 = 0, count2 = 0, count3 = 0, count4 = 0, count5 = 0, count6 = 0;

// for (var i = 0; i < 1000; i++) {
//     var index = Lottery.get();
//     if (index == 0) count1 += 1;
//     if (index == 1) count2 += 1;
//     if (index == 2) count3 += 1;
//     if (index == 3) count4 += 1;
//     if (index == 4) count5 += 1;
//     if (index == 5) count6 += 1;
// }

// console.log(count1, count2, count3, count4, count5, count6)


module.exports = Lottery;
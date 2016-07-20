//nodejs执行, 每月第一天执行

var mongojs = require('mongojs');

var Promise = require('promise');

var request = require('request');

var _ = require('lodash');

var db = mongojs('zgz', ['rankingList', 'activityList', 'activityGrantRecord']);

var moment = require('moment');




var gameHttpUrl = "http://127.0.0.1:1337/";


//为股神月排行榜发放奖励，每月第一天执行时，拿到最新的排行榜数据就是月排行榜最终数据
db.rankingList.find({ type: 'GOD_MONTH' }).sort({ _id: -1 }).limit(1, function (err, docs) {
    if (err) {
        console.log('发放股神月排行榜奖励失败，%o', new Date());
        db.close();
        process.exit();
    }
    else {
        if (!docs || !_.isArray(docs) || docs.length == 0) {
            console.log('当月还没有产生排行榜数据，%o', new Date());
            db.close();
            process.exit();
            return;
        }

        getActivityGodMonth(function (activity) {
            if (!activity || !activity.enabled) {
                console.log('股神月排行榜活动未开启，%o', new Date());
                db.close();
                process.exit();
                return;
            }

            var rankingList = docs[0].ranking;
            //mongo shell的sort后，还是升序，这里反转为降序
            rankingList = _.sortBy(rankingList, 'winning').reverse();

            //把为每一个用户奖励的操作作为一个promise，多个就是一个promise数组
            var requestPromiseList = rankingList.map(function (ranking, i) {
                return new Promise(function (resolve, reject) {
                    //获取奖励配置
                    var grant = activity.grant[i];

                    //因为奖励可能同时包含金币/道具，http接口均为单独接口，所以为每种操作创建promise
                    var optionPromiseList = [];

                    var options = {
                        method: 'POST'
                    };

                    if (grant.fragment) {
                        options.url = gameHttpUrl + "api/game/addFragment"
                        options.json = { uid: ranking._id, type: 'ACTIVITY', fragment: grant.fragment };
                        var optionPromise = new Promise(function (resolve, reject) {
                            request.post(options, function () {
                                resolve(null);
                            });
                        });
                        optionPromiseList.push(optionPromise);
                    }
                    if (grant.items) {
                        options.url = gameHttpUrl + "api/game/addItems"
                        options.json = { uid: ranking._id, type: 'ACTIVITY', items: grant.items };
                        var optionPromise = new Promise(function (resolve, reject) {
                            request.post(options, function () {
                                resolve(null);
                            });
                        });
                        optionPromiseList.push(optionPromise);
                    }
                    if (grant.gold) {
                        options.url = gameHttpUrl + "api/game/addGold"
                        options.json = { uid: ranking._id, type: 'ACTIVITY', gold: grant.gold };
                        var optionPromise = new Promise(function (resolve, reject) {
                            request.post(options, function () {
                                resolve(null);
                            });
                        });
                        optionPromiseList.push(optionPromise);
                    }

                    Promise.all(optionPromiseList).then(function (res) {
                        //为玩家发放完奖励后，写入奖励记录
                        var record = { name: "GOD_MONTH", uid: ranking._id, state: 'FINISHED', detail: { rank: i + 1, winning: ranking.winning }, createdAt: new Date() };
                        db.activityGrantRecord.save(record, function () {
                            resolve();
                        });
                        
                    })

                });

            });

            Promise.all(requestPromiseList).then(function (res) {
                console.log("~~ All options handled ~~");
                db.close()
                process.exit()
            });
        })



    }
});

function getGodMonthGrantDetailByRanking(ranking, cb) {
    db.activityList.findOne({ name: "GOD_MONTH" }, function (err, doc) {
        if (err) {
            cb(null);
            return;
        }
        try {
            cb(doc.grant[i]);
        } catch (e) {
            cb(null);
        }

    })
}

function getActivityGodMonth(cb) {
    db.activityList.findOne({ name: "GOD_MONTH" }, function (err, doc) {
        if (err) {
            cb(null);
            return;
        }
        try {
            cb(doc);
        } catch (e) {
            cb(null);
        }

    })
}
var shortid = require('shortid');

var mongojs = require('mongojs');

var Promise = require('promise');

var _ = require('lodash');

var db = mongojs("mongodb://localhost:27017/zgz",
['user']);


try {
//为用户数据添加邀请码字段（shortid）
    db.user.find(function (err, docs) {
        if (err) return;
        if (docs != null && docs.length > 0) {
            var updatePromiseList = _.map(docs, function (user) {
                return new Promise(function (resolve, reject) {
                    db.user.update({_id: user._id}, {$set: {shortid: shortid.generate()}}, function () {
                        resolve();
                    });
                })
            });

            Promise.all(updatePromiseList)
                .then(function () {
                    console.log('update shortid finished...')
                    db.close();
                    process.exit();
                })

        }
    });

} catch (e) {
    console.log(e);
}
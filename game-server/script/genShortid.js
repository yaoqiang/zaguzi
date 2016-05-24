var shortid = require('shortid');

var mongojs = require('mongojs');

var db = mongojs("mongodb://localhost:27017/zgz",
['user']);


//为用户数据添加邀请码字段（shortid）
db.user.find(function (err, docs) {
    if (err) return;
    if (docs != null && docs.length > 0) {
        docs.forEach(function (user) {
            if (user.shortid == null || user.shortid == undefined || user.shortid == '') {
                db.user.update({_id: user._id}, {$set: {shortid: shortid.generate()}});
            }
        })
    }
});

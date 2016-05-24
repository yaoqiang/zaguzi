var shortid = require('shortid');

var db = connect('zgz');

//为用户数据添加邀请码字段（shortid）
var userList = db.user.find();
userList.forEach(function (user) {
    if (user.shortid == null || user.shortid == undefined || user.shortid == '') {
        db.user.update({_id: user._id}, {$set: {shortid: shortid.generate()}});
    }
})

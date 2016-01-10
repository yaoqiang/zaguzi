var db = connect('zgz');

db.player.remove({});
db.user.remove({});

var User = function(username, password) {
    this.username = username;
    this.password = password;
    this.mobile = '';
    this.loginCount = 0;
    this.createdAt = new Date();
    this.lastLoginAt = new Date();
}

function initUser(users) {
    db.user.remove({});
    users.forEach(function (u) {
        db.user.save(u);
    })
}

var u1 = new User('a', 'a');
var u2 = new User('b', 'b');
var u3 = new User('c', 'c');
var u4 = new User('d', 'd');
var u5 = new User('e', 'e');
var u6 = new User('f', 'f');
var u7 = new User('g', 'g');
var u8 = new User('h', 'h');
var u9 = new User('i', 'i');
var u10 = new User('j', 'j');

var yaoqiang = new User('yaoqiang', '0');
var lvjiancheng = new User('lvjiancheng', '0');
var lijianxin = new User('lijianxin', '0');
var xuewen = new User('xuewen', '0');
var zhangjianyang = new User('zhangjianyang', '0');
var fanyiwei = new User('fanyiwei', '0');
var zanghongwen = new User('zanghongwen', '0');

var users = new Array(u1, u2, u3, u4, u5, u6, u7, u8, u9, u10, yaoqiang, lvjiancheng, lijianxin, xuewen, zhangjianyang, fanyiwei, zanghongwen);


initUser(users);
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

//exchange list
db.exchangeList.save({name: '1元话费', denomination: 1, icon: '', inventory: 9999, fragment: 2, createdAt: new Date(), enabled: true, type: 'INBOX_CALL'});
db.exchangeList.save({name: '5元话费', denomination: 5, icon: '', inventory: 9999, fragment: 5, createdAt: new Date(), enabled: true, type: 'INBOX_CALL'});
db.exchangeList.save({name: '10元话费', denomination: 10, icon: '', inventory: 9999, fragment: 10, createdAt: new Date(), enabled: true, type: 'INBOX_CALL'});
db.exchangeList.save({name: '30元话费', denomination: 30, icon: '', inventory: 9999, fragment: 30, createdAt: new Date(), enabled: true, type: 'INBOX_CALL'});
db.exchangeList.save({name: '50元话费', denomination: 50, icon: '', inventory: 9999, fragment: 50, createdAt: new Date(), enabled: false, type: 'INBOX_CALL'});


db.exchangeRecord.save({uid: ObjectId('56ac9e72ba27df1c78df57fb'), number: '1', createdAt: new Date(), exchangeId: 1, productName: '1元话费', state: 'FINISHED', mobile: '18600000000', address: '', contact: ''});


db.appReleaseRecord.save({name: '', version: '1.0', createdAt: new Date(), summary: '【新增】发布第一个版本'});

db.systemMessage.save({title: '大同扎股子上线啦！', content: '全球首款大同扎股子手游已登录地球，同胞们尽情享受吧！', enabled: true, createdAt: new Date()});
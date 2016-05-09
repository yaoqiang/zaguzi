var db = connect('zgz');

db.player.remove({});
db.user.remove({});

var User = function (username, password) {
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

var u1 = new User('a', 'sha1$5b1432f8$1$34eef7e9b27474c1471596820235c2ed5abb8e2f');
var u2 = new User('b', 'sha1$3153aa46$1$2b8aaf463cfb7670fa64b851d9ec00d5d01389f0');
var u3 = new User('c', 'sha1$e3ec0dd8$1$9ab0e904573dcd472a8463ea82e2f4624f4343fd');
var u4 = new User('d', 'sha1$ca8bbaa4$1$b995f176ca094351f1da76b134fbcce22250e6af');
var u5 = new User('e', 'sha1$1f698781$1$7f2018578e4a6fb4419d6a469f797f36a08171fa');
var u6 = new User('f', 'sha1$362cb3e2$1$0304bd32a3196e1f3f5e71615bba1e224be08bdb');
var u7 = new User('g', 'sha1$b497bed8$1$df2963983f6b861cd9bf85fad26b05e9f52c8879');
var u8 = new User('h', 'sha1$9aa06ca6$1$a8ec85907b064bd0d7114ed68d79acb1b65acc6b');
var u9 = new User('i', 'sha1$6936b73f$1$b3ad6639a4d9016ff704fa7d9054d8afb718026b');
var u10 = new User('j', 'sha1$5d05cbc4$1$e994a2d6f1221fa77211d75a76b6e15505b31615');

var yaoqiang = new User('yaoqiang', 'sha1$34063f9b$1$4b0ea3bad14424310bc0a2145917e86c7fe98019');
var lvjiancheng = new User('lvjiancheng', 'sha1$34063f9b$1$4b0ea3bad14424310bc0a2145917e86c7fe98019');
var lijianxin = new User('lijianxin', 'sha1$34063f9b$1$4b0ea3bad14424310bc0a2145917e86c7fe98019');
var xuewen = new User('xuewen', 'sha1$34063f9b$1$4b0ea3bad14424310bc0a2145917e86c7fe98019');
var zhangjianyang = new User('zhangjianyang', 'sha1$34063f9b$1$4b0ea3bad14424310bc0a2145917e86c7fe98019');
var fanyiwei = new User('fanyiwei', 'sha1$34063f9b$1$4b0ea3bad14424310bc0a2145917e86c7fe98019');
var zanghongwen = new User('zanghongwen', 'sha1$34063f9b$1$4b0ea3bad14424310bc0a2145917e86c7fe98019');

var users = new Array(u1, u2, u3, u4, u5, u6, u7, u8, u9, u10, yaoqiang, lvjiancheng, lijianxin, xuewen, zhangjianyang, fanyiwei, zanghongwen);


initUser(users);

//exchange list
db.exchangeList.save({
    name: '1元充值卡',
    denomination: 1,
    icon: '',
    inventory: 9999,
    fragment: 2,
    createdAt: new Date(),
    enabled: true,
    type: 'INBOX_CALL'
});
db.exchangeList.save({
    name: '5元充值卡',
    denomination: 5,
    icon: '',
    inventory: 9999,
    fragment: 5,
    createdAt: new Date(),
    enabled: true,
    type: 'INBOX_CALL'
});
db.exchangeList.save({
    name: '10元充值卡',
    denomination: 10,
    icon: '',
    inventory: 9999,
    fragment: 10,
    createdAt: new Date(),
    enabled: true,
    type: 'INBOX_CALL'
});
db.exchangeList.save({
    name: '30元充值卡',
    denomination: 30,
    icon: '',
    inventory: 9999,
    fragment: 30,
    createdAt: new Date(),
    enabled: true,
    type: 'INBOX_CALL'
});
db.exchangeList.save({
    name: '50元充值卡',
    denomination: 50,
    icon: '',
    inventory: 9999,
    fragment: 50,
    createdAt: new Date(),
    enabled: true,
    type: 'INBOX_CALL'
});


db.exchangeList.save({
    name: '6888金+喇叭3+记', gold: 6888,
    items: [
        {
        "id": 2,
        "value": 3
        },
        {
            "id": 3,
            "value": 1
        }],
    icon: 'GIFT', inventory: 9999, fragment: 5, createdAt: new Date(), enabled: true, type: 'VIRTUAL'
});
db.exchangeList.save({
    name: '小喇叭20个', gold: 0,
    items: [
        {
            "id": 2,
            "value": 20
        }],
    icon: 'TRUMPET',
    inventory: 9999,
    fragment: 5,
    createdAt: new Date(),
    enabled: true,
    type: 'VIRTUAL'
});

db.exchangeList.save({
    name: '记牌器7天', gold: 0,
    items: [
    {
        "id": 3,
        "value": 7
    }],
    icon: 'NOTE_CARD',
    inventory: 9999,
    fragment: 2,
    createdAt: new Date(),
    enabled: true,
    type: 'VIRTUAL'
});


db.appleSetting.save({inReview: false});

db.exchangeRecord.save({
    uid: ObjectId('56ac9e72ba27df1c78df57fb'),
    number: '1',
    createdAt: new Date(),
    exchangeId: 1,
    productName: '1元话费',
    state: 'FINISHED',
    mobile: '18600000000',
    address: '',
    contact: ''
});


db.appReleaseRecord.save({
    name: '',
    version: '1.0',
    createdAt: new Date(),
    summary: '【新增】发布第一个版本',
    releaseUrlAndroid: 'http://www.pgyer.com/zgza',
    releaseUrlApple: ''
});

db.appReleaseRecord.save({
    name: '',
    version: '1.2',
    createdAt: new Date(),
    summary: '【新增】开启股神帮赢大奖!\n【改进】完善游戏,修复bug',
    releaseUrlAndroid: 'http://www.pgyer.com/zgza',
    releaseUrlApple: ''
});

db.systemMessage.save({
    title: '大同扎股子公测版上线啦！',
    content: '全球首款大同扎股子手游已登录地球，尽情享受吧！',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '##必读## 即将迎来5.1新版发布, 安卓用户更新须知!!!',
    content: '安卓用户请绑定手机号, 以免账号丢失, 详情关注公众号: 大同扎股子, ',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '##必读## 股子们, 福利来了!!!',
    content: '为回馈近期充值的朋友,赠送3天记牌器+3喇叭,感谢支持!',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '##必读## 股子们, 第一波活动来袭!!!',
    content: '5.1期间冲股神榜有奖活动开启,关注公众号: 大同扎股子',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '##必读## 近期充值遇到问题的请关注!!!',
    content: '充值扣款成功未添加金币道具的,联系:0352-7963773,给您带来不便请谅解',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({title: '开启全民扎股子时代！', content: '开启全民扎股子时代！', enabled: true, createdAt: new Date()});
db.systemMessage.save({title: '5 6 7人场同步上线！', content: '根据自己爱好随意选场次, 嗨翻天!', enabled: true, createdAt: new Date()});
db.systemMessage.save({title: '大同扎股子在苹果应用商店上线!！', content: '搜索扎股子, 独此一家!！', enabled: true, createdAt: new Date()});
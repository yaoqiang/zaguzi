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




//////////////////////////////////////////
// 线上数据
//////////////////////////////////////////

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

//预先测试数据

db.exchangeList.save({
    name: 'iPhone 7',
    denomination: 0,
    icon: 'http://assets.zaguzi.com/mobile_pay.png',
    inventory: 10,
    fragment: 8888,
    createdAt: new Date(),
    enabled: true,
    type: 'OUTBOX'
});

db.exchangeList.save({
    name: '柴米油盐',
    denomination: 0,
    icon: 'http://assets.zaguzi.com/mobile_pay.png',
    inventory: 10,
    fragment: 1,
    createdAt: new Date(),
    enabled: true,
    type: 'OUTBOX'
});

//苹果审核状态开关
db.appleSetting.save({ inReview: false });
//苹果审核中
db.appleSetting.update({}, {$set: { inReview: true }});
//苹果审核结束
db.appleSetting.update({}, {$set: { inReview: false }});


//版本发布记录
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

db.appReleaseRecord.save({
    name: '',
    version: '1.3',
    createdAt: new Date(),
    summary: '【新增】各种新体验,股神月排行榜,月月拿奖!\n【改进】各种改进,bug修复!\n【亮点】邀请奖励,私人场,双三可认等等..\n玩转新版本可点击系统邮件查看',
    releaseUrlAndroid: 'http://www.zaguzi.com/download_android.html',
    releaseUrlApple: ''
});

db.appReleaseRecord.save({
    name: '',
    version: '1.4',
    createdAt: new Date(),
    summary: '【新增】幸运抽奖游戏!\n【优化】各种改进,bug修复!\n',
    releaseUrlAndroid: 'http://www.zaguzi.com/download_android.html',
    releaseUrlApple: ''
});

db.appReleaseRecord.save({
    name: '',
    version: '1.4.1',
    createdAt: new Date(),
    summary: '进一步提高稳定性，\n让您在游戏中体验更好。',
    releaseUrlAndroid: 'http://www.zaguzi.com/download_android.html',
    releaseUrlApple: ''
});



//系统消息
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

db.systemMessage.save({
    title: '##必读## 股神榜活动圆满结束',
    content: '股子们,股神榜活动奖励已发放,大家注意查收!奖品关注公众号',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '##必读## 助力大同获主办权!',
    content: '恭喜大同获得省旅游发展大会主办权场内第一,关注公众号来领奖!',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '##通告## 高倍区打伙牌作弊处理',
    content: '股子们,游戏禁止打伙牌作弊,高倍伙牌玩家金币已清零.',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '##置顶## 新版本发布啦!快来更新吧!',
    content: '夏日炎炎,新版本发布啦,股神月榜等你来拿奖!点击查看详情',
    url: 'http://www.zaguzi.com/app_release_1_3.html',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '##号外## 苹果新版本上线啦!快来更新吧!',
    content: '苹果新版本在游戏结束后偶尔不显示结算面板,请大家先克服.',
    url: '',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '绿色游戏  拒绝作弊',
    content: '作弊行为严惩不贷，点击查看详情',
    url: 'http://www.zaguzi.com/green_game_1.html',
    enabled: true,
    createdAt: new Date()
});


db.systemMessage.save({
    title: '8月股神榜排名揭晓！',
    content: '奖励已发放, 请注意查收，点击查看详情',
    url: 'http://www.zaguzi.com/activity_god_month_record.html',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '喜迎中秋  送好礼！',
    content: '豆面团队在这里祝大家中秋快乐，阖家团圆！点击查看详情',
    url: 'http://mp.weixin.qq.com/s?__biz=MzI4ODIzMjM1Mw==&mid=2660937874&idx=1&sn=58695bda011a8cc55a408f537cefa5ce&scene=0#rd',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '立冬了！',
    content: '豆面团队提醒大家注意保暖！点击查看详情',
    url: 'http://mp.weixin.qq.com/s?__biz=MzI4ODIzMjM1Mw==&mid=2660937881&idx=1&sn=574a0c6c118b1fc165f7f4b09b554c3e&chksm=f0af9657c7d81f416c635be1bb37af30b780c54c517b00492d653c1d5a717790b588376bb7b4&scene=0#wechat_redirect',
    enabled: true,
    createdAt: new Date()
});

db.systemMessage.save({
    title: '重要通知',
    content: '系统兑换即将调整！点击查看详情',
    url: 'http://mp.weixin.qq.com/s/FgOderbF7vgQVARwdsWuCQ',
    enabled: true,
    createdAt: new Date()
});

//活动结构 {content: 游戏内显示, detail: 游戏内显示, }
//updatedAt: 用于检测最新活动信息, 如果修改了信息, 则修改该字段, 客户端会检测如果本地不是最新的则拉取最新数据
db.activityList.save({
    title: '股神榜-月排行榜',
    content: '当月游戏300局以上,就有资格上榜!',
    detail: '第一名: 30元宝+20000金+7喇叭+7天记牌器\n第二名: 10元宝+10000金+5喇叭+5天记牌器\n第三名: 5元宝+7000金+3喇叭+3天记牌器\n第4-10名: 1元宝+5000金+1喇叭+1天记牌器\n第11-20名: 5000金\n\n来吧股神!作弊取消资格并严惩!!',
    icon: '',
    name: 'GOD_MONTH',
    type: 'ROUND',
    unit: 'MONTH',
    threshold: { battle: 300 },
    enabled: true,
    visible: false,
    urlForIntro: 'http://www.zaguzi.com/activity_god_month.html',
    urlForRecord: 'http://www.zaguzi.com/activity_god_month_record.html',
    grant: [
        { rank: 1, fragment: 30, gold: 20000, items: [{ id: 2, value: 7 }, { id: 3, value: 7 }] },
        { rank: 2, fragment: 10, gold: 10000, items: [{ id: 2, value: 5 }, { id: 3, value: 5 }] },
        { rank: 3, fragment: 5, gold: 7000, items: [{ id: 2, value: 3 }, { id: 5, value: 3 }] },
        { rank: 4, fragment: 1, gold: 5000, items: [{ id: 2, value: 1 }, { id: 3, value: 1 }] },
        { rank: 5, fragment: 1, gold: 5000, items: [{ id: 2, value: 1 }, { id: 3, value: 1 }] },
        { rank: 6, fragment: 1, gold: 5000, items: [{ id: 2, value: 1 }, { id: 3, value: 1 }] },
        { rank: 7, fragment: 1, gold: 5000, items: [{ id: 2, value: 1 }, { id: 3, value: 1 }] },
        { rank: 8, fragment: 1, gold: 5000, items: [{ id: 2, value: 1 }, { id: 3, value: 1 }] },
        { rank: 9, fragment: 1, gold: 5000, items: [{ id: 2, value: 1 }, { id: 3, value: 1 }] },
        { rank: 10, fragment: 1, gold: 5000, items: [{ id: 2, value: 1 }, { id: 3, value: 1 }] },
        { rank: 11, gold: 5000 },
        { rank: 12, gold: 5000 },
        { rank: 13, gold: 5000 },
        { rank: 14, gold: 5000 },
        { rank: 15, gold: 5000 },
        { rank: 16, gold: 5000 },
        { rank: 17, gold: 5000 },
        { rank: 18, gold: 5000 },
        { rank: 19, gold: 5000 },
        { rank: 20, gold: 5000 },
    ],
    createdAt: new Date(),
    updatedAt: new Date()
});

db.activityList.remove({});

//设置股神榜月排行开关状态
db.activityList.update({name: 'GOD_MONTH'}, {$set: {enabled: true}});

db.activityGrantRecord.save({
    name: "GOD_MONTH",
    uid: "",
    state: "",
    detail: {rank: 1},
    createdAt: new Date(),
});



//兑换记录结构
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



//修改密码为：zaguzi
db.user.update({ mobile: '13934807613' }, { $set: { password: 'sha1$b211be4c$1$12a897ae563de0acab2e4eafaad3a5c373de32fa' } });
db.user.update({ _id: ObjectId('570dbb8cd7958a093765d94b') }, { $set: { password: 'sha1$b211be4c$1$12a897ae563de0acab2e4eafaad3a5c373de32fa' } });
db.user.update({ _id: ObjectId('57447b7aa01f604f6ee43447') }, { $set: { mobile: '18735223656' } });
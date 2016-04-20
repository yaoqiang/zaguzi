var mongojs = require('mongojs');
var Promise = require('promise');
var fs = require('fs');
var readline = require('readline');

var loggerErr = require('log4js').getLogger(consts.LOG.ERROR);


var db = mongojs('zgz', ['logGameRecord', 'logLoginRecord', 'logPaymentRecord', 'logOnlineRecord', 'logUserRecord']);

var glob = require("glob")

try {


// game-all.log 是最早打算用来存储全局的,后来日志结构调整, 保留了命名: 现在应概念定义成:用户相关的日志.(userRecord)
// 处理log, 忽略pomelo的log；忽略调试&错误log；忽略当日log；只处理INFO级别, 格式必须按照指定的
    glob("../logs/*",
        {
            "ignore": ['../logs/admin*', '../logs/con*', '../logs/crash*', '../logs/forward*', '../logs/pomelo*', '../logs/rpc*',
                '../logs/game-http*', '../logs/open-api*', '../logs/error*', '../logs/game-system*',
                '../logs/game-all.log', '../logs/game-record.log', '../logs/login-record.log', '../logs/online-record.log', '../logs/payment.log']
        }, function (err, files) {

            if (files.length === 0) return;

            var fileOps = files.map(function (f, index) {

                console.log(f);

                if (f.indexOf('../logs/game-all.log') == 0) {
                    return new Promise(function (resolve, reject) {
                        var mongoOps = [];

                        readline.createInterface({
                            input: fs.createReadStream(f),
                            terminal: false
                        }).on('line', function (line) {
                                var logArray = parse(line);
                                //解析后的日志格式
                                // [ '2016-04-20 00:00:26.828', 'INFO', 'game-all', '-', '{"uid":"571655bc56dc2cab6c842587","type":"USER","action":"ADD_GOLD","message":"添加金币成功","created":"2016-04-19T16:00:26.828Z","detail":{"type":"GRANT","value":500}}' ]

                                //因为有历史遗留日志(WARN), 顾只处理INFO级别
                                if (logArray[1].logLevel === 'INFO') {
                                    var userRecord = {};
                                    userRecord.createdAt = new Date(logArray[0]);
                                    userRecord.logLevel = logArray[1];
                                    var content = JSON.parse(logArray[4]);
                                    userRecord.uid = content.uid;
                                    userRecord.type = content.type;
                                    userRecord.action = content.action;
                                    userRecord.message = content.message;
                                    userRecord.detail = content.detail;

                                    var mongoOp = new Promise(function (resolve, reject) {
                                        db.logUserRecord.save(userRecord, function () {
                                            resolve(null);
                                        });
                                    });
                                    mongoOps.push(mongoOp);
                                }
                            })
                            .on('close', function () {
                                Promise.all(mongoOps).then(function (res) {
                                    console.log(f + ' will delete game-all log file!');

                                    //fs.unlink(f, function() {
                                    resolve();
                                    console.log(f + 'did delete game-all log file!');
                                    //});
                                })

                            });

                    });

                }
                else if (f.indexOf('../logs/game-record.log') == 0) {
                    return new Promise(function (resolve, reject) {
                        var mongoOps = [];

                        readline.createInterface({
                            input: fs.createReadStream(f),
                            terminal: false
                        }).on('line', function (line) {
                                var logArray = parse(line);
                                // [ '2016-04-09 21:54:00.642', 'INFO', 'game-record', '-', '{"lobby":5,"roomId":11,"result":"RED_WIN","share":3,"meeting":false}' ]

                                var gameRecord = {};
                                gameRecord.createdAt = new Date(logArray[0]);
                                gameRecord.logLevel = logArray[1];
                                var content = JSON.parse(logArray[4]);
                                gameRecord.lobby = content.lobby;
                                gameRecord.roomId = content.roomId;
                                gameRecord.result = content.result;
                                gameRecord.share = content.share;
                                gameRecord.meeting = content.meeting;

                                var mongoOp = new Promise(function (resolve, reject) {
                                    db.logGameRecord.save(gameRecord, function () {
                                        resolve(null);
                                    });
                                });
                                mongoOps.push(mongoOp);

                            })
                            .on('close', function () {
                                Promise.all(mongoOps).then(function (res) {
                                    console.log(f + ' will delete game-record log file!');

                                    //fs.unlink(f, function() {
                                    resolve();
                                    console.log(f + 'did delete game-record log file!');
                                    //});
                                })

                            });

                    });
                }
                else if (f.indexOf('../logs/login-record.log') == 0) {
                    return new Promise(function (resolve, reject) {
                        var mongoOps = [];

                        readline.createInterface({
                            input: fs.createReadStream(f),
                            terminal: false
                        }).on('line', function (line) {
                                var logArray = parse(line);
                                // [ '2016-04-20 00:00:35.917', 'INFO', 'login-record', '-', '{"uid":"5716545d56dc2cab6c842586","serverId":"connector-server-1","ip":"223.9.68.33","os":"android","date":"2016-04-19T16:00:35.917Z"}' ]

                                var loginRecord = {};
                                loginRecord.createdAt = new Date(logArray[0]);
                                loginRecord.logLevel = logArray[1];
                                var content = JSON.parse(logArray[4]);
                                loginRecord.uid = content.uid;
                                loginRecord.serverId = content.serverId;
                                loginRecord.ip = content.ip;
                                loginRecord.os = content.os;

                                var mongoOp = new Promise(function (resolve, reject) {
                                    db.logLoginRecord.save(loginRecord, function () {
                                        resolve(null);
                                    });
                                });
                                mongoOps.push(mongoOp);


                            })
                            .on('close', function () {
                                Promise.all(mongoOps).then(function (res) {
                                    console.log(f + ' will delete login-record log file!');

                                    //fs.unlink(f, function() {
                                    resolve();
                                    console.log(f + 'did delete login-record log file!');
                                    //});
                                })

                            });

                    });
                }
                else if (f.indexOf('../logs/online-record.log') == 0) {
                    return new Promise(function (resolve, reject) {
                        var mongoOps = [];

                        readline.createInterface({
                            input: fs.createReadStream(f),
                            terminal: false
                        }).on('line', function (line) {
                                var logArray = parse(line);
                                // [ '2016-04-20 00:00:35.917', 'INFO', 'online-record', '-', '{"createdAt":"2016-04-19T16:00:25.769Z","data":{"total":32,"lobby":[{"id":0,"online":25},{"id":1,"online":0},{"id":2,"online":3}],"room":[{"id":11,"online":25},{"id":12,"online":0},{"id":13,"online":0},{"id":14,"online":0},{"id":21,"online":0},{"id":22,"online":0},{"id":23,"online":0},{"id":24,"online":0},{"id":31,"online":3},{"id":32,"online":0},{"id":33,"online":0},{"id":34,"online":0}]}}' ]

                                var onlineRecord = {};
                                onlineRecord.createdAt = new Date(logArray[0]);
                                onlineRecord.logLevel = logArray[1];
                                var content = JSON.parse(logArray[4]);
                                onlineRecord.data = content.data;

                                var mongoOp = new Promise(function (resolve, reject) {
                                    db.logOnlineRecord.save(onlineRecord, function () {
                                        resolve(null);
                                    });
                                });
                                mongoOps.push(mongoOp);


                            })
                            .on('close', function () {
                                Promise.all(mongoOps).then(function (res) {
                                    console.log(f + ' will delete online-record log file!');

                                    //fs.unlink(f, function() {
                                    resolve();
                                    console.log(f + 'did delete online-record log file!');
                                    //});
                                })

                            });

                    });
                }
                else if (f.indexOf('../logs/payment.log') == 0) {
                    return new Promise(function (resolve, reject) {
                        var mongoOps = [];

                        readline.createInterface({
                            input: fs.createReadStream(f),
                            terminal: false
                        }).on('line', function (line) {
                                var logArray = parse(line);
                                // [ '2016-04-20 00:00:25.769', 'INFO', 'payment', '-', '{"uid":"5716d13356dc2cab6c842596","type":"PAYMENT","action":"PAID_OPTION","message":"pingpp客户端取消支付或支付失败后向服务器上报订单信息, 处理订单状态成功","created":"2016-04-20T06:17:32.105Z","detail":{"data":{"state":"cancel","__route__":"connector.universalHandler.payment4PingppFromClient","uid":"5716d13356dc2cab6c842596"}}}' ]

                                var paymentRecord = {};
                                paymentRecord.createdAt = new Date(logArray[0]);
                                paymentRecord.logLevel = logArray[1];
                                var content = JSON.parse(logArray[4]);
                                paymentRecord.uid = content.uid;
                                paymentRecord.type = content.type;
                                paymentRecord.action = content.action;
                                paymentRecord.message = content.message;
                                paymentRecord.detail = content.detail;

                                var mongoOp = new Promise(function (resolve, reject) {
                                    db.logPaymentRecord.save(paymentRecord, function () {
                                        resolve(null);
                                    });
                                });
                                mongoOps.push(mongoOp);

                            })
                            .on('close', function () {
                                Promise.all(mongoOps).then(function (res) {
                                    console.log(f + ' will delete payment-record log file!');

                                    //fs.unlink(f, function() {
                                    resolve();
                                    console.log(f + 'did delete payment-record log file!');
                                    //});
                                })

                            });

                    });
                }


            });

            Promise.all(fileOps).then(function (res) {
                console.log("~~ All files handled ~~")
                db.close()
                process.exit()
            });
        })
} catch (e) {
    loggerErr.error('%j', {type: 'log2db', desc: '日志导入到Mongo时候发生错误.', error: e});
}

function parse(str) {
    //log中包含嵌套Object, 如果是第一次出现'{', 才算开始, 嵌套Object的'{'忽略
    var isFirstObjectSymbol = true;
    //处理'[' and ']', 前两次出现才独立存储在数组中一位, (日期和INFO)
    var startArraySymbol = 0;
    function _parse(str, state, res) {
        if (str == '')
            return res;
        if (state == 0) { //parse by next space
            if (str[0] == ' ') {
                res.push('')
                return _parse(str.slice(1), 0, res)
            } else if (str[0] == '{' && isFirstObjectSymbol) {
                isFirstObjectSymbol = false;
                res[res.length - 1] = res[res.length - 1] + str[0]
                return _parse(str.slice(1), 1, res)
            } else if (str[0] == '[' && startArraySymbol < 2) {
                startArraySymbol++;
                res[res.length - 1] = res[res.length - 1]
                return _parse(str.slice(1), 1, res)
            } else {
                res[res.length - 1] = res[res.length - 1] + str[0]
                return _parse(str.slice(1), 0, res)
            }

        } else { //parse by next
            var suffix = '}';
            //根据不同类型log结尾拼凑分隔符
            if (res[2] == 'payment') {
                suffix = '}}}'
            }
            else if (res[2] == 'game-all') {
                suffix = '}}'
            }
            else if (res[2] == 'online-record') {
                suffix= '}}';
            }

            if (str[0] == suffix) {
                res[res.length - 1] = res[res.length - 1] + str[0]
                return _parse(str.slice(1), 0, res)
            } else if (str[0] == ']' && startArraySymbol < 2) {
                startArraySymbol++;
                res[res.length - 1] = res[res.length - 1]
                return _parse(str.slice(1), 0, res)
            } else {
                res[res.length - 1] = res[res.length - 1] + str[0]
                return _parse(str.slice(1), 1, res)
            }
        }
    }

    return _parse(str, 0, [''])
}

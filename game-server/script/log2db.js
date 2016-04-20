var mongojs = require('mongojs');
var Promise = require('promise');
var fs = require('fs');
var readline = require('readline');


var db = mongojs('zgz', ['logGameRecord', 'logLoginRecord', 'logPaymentRecord', 'logOnlineRecord', 'logGameAll']);

var glob = require("glob")


// 处理log, 忽略pomelo的log；忽略调试&错误log；忽略当日log；
glob("../logs/*", 
    {"ignore": ['../logs/admin*', '../logs/con*', '../logs/crash*', '../logs/forward*', '../logs/pomelo*', '../logs/rpc*', 
    '../logs/game-http*', '../logs/open-api*', '../logs/error*', '../logs/game-system*',
    '../logs/game-all.log', '../logs/game-record.log', '../logs/login-record.log', '../logs/online-record.log', '../logs/payment.log']}, function(err, files) {

    if (files.length === 0) return;

    var fileOps = files.map(function(f, index) {

        console.log(f);

        return new Promise(function(resolve, reject) {
            var mongoOps = [];

            readline.createInterface({
                input: fs.createReadStream(f),
                terminal: false
            }).on('line', function(line) {
                var logArray = parse(line);
                // [ '2016-04-09 21:54:00.642', 'INFO', 'game-record', '-', '{"lobby":5,"roomId":11,"result":"RED_WIN","share":3,"meeting":false}' ]
                var gameRecord = {};
                gameRecord.createdAt = new Date(logArray[0]);
                gameRecord.logLevel = logArray[1];
                var detail = JSON.parse(logArray[4]);
                gameRecord.lobby = detail.lobby;
                gameRecord.roomId = detail.roomId;
                gameRecord.result = detail.result;
                gameRecord.share = detail.share;
                gameRecord.meeting = detail.meeting;

                var mongoOp = new Promise(function(resolve, reject){
                    db.logGameRecord.save(gameRecord, function(){
                        resolve(null);
                    });  
                });
                mongoOps.push(mongoOp);
            })
            .on('close', function() {
                Promise.all(mongoOps).then(function(res){
                    console.log(f + ' will delete log file!');
                    
                    //fs.unlink(f, function() {
                        resolve();
                        console.log(f + 'did delete log file!');
                    //});
                })
                 
            });

        });
    });

   Promise.all(fileOps).then(function(res){
        console.log("~~ All files handled ~~")
        db.close()
        process.exit()
    });
})

function parse(str) {
    function _parse(str, state, res) {
        if(str == '')
            return res;
        if(state == 0) { //parse by next space
            if(str[0] == ' ') {
                res.push('')
                return _parse(str.slice(1), 0, res)
            } else if(str[0] == '{') {
                res[res.length - 1] = res[res.length - 1] + str[0]
                return _parse(str.slice(1), 1, res)
            } else if (str[0] == '[') {
                res[res.length - 1] = res[res.length - 1]
                return _parse(str.slice(1), 1, res)
            } else {
                res[res.length - 1] = res[res.length - 1] + str[0]
                return _parse(str.slice(1), 0, res)
            }

        } else { //parse by next 
            if(str[0] == '}') {
                res[res.length - 1] = res[res.length - 1] + str[0]
                return _parse(str.slice(1), 0, res)
            } else if(str[0] == ']') {
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
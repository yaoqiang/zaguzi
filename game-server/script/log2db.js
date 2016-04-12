<<<<<<< HEAD
var mongojs = require('mongojs');
var fs = require('fs');
var readline = require('readline');

var db = mongojs('zgz', ['logGameRecord', 'logLoginRecord', 'logPaymentRecord', 'logGameAll']);

var glob = require("glob")


var GAME_RECORD_FILE_NAME_PREFIX = "game-record.log";
var GAME_RECORD_PREFIX = "game-record";





// 处理GameRecord
glob("./game-record.log*", {}, function (err, files) {
	console.log(files);

	if (files.length === 0) return;

	files.forEach(function(f) {

		if (f === "./game-record.log") return;

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

		   db.logGameRecord.save(gameRecord);
		}).on('close', function() {
			console.log(f + ' will delete log file!');
			fs.unlink(f, function() {
                console.log(f + 'did delete log file!');
            });
		});
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
=======
var _ = require('lodash');
var fs = require('fs');
var mongojs = require('mongojs');




>>>>>>> 7309dc19f95cfddab31b9f38fd4e312852cbe281

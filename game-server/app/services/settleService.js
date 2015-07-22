var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.SETTLE, __filename);
var pomelo = require('pomelo');
var async = require('async');

var Code = require('../../../shared/code');
var _ = require('underscore');

var exp = module.exports;

exp.settle = function (game, cb) {
    exp.settleCommon(game, cb);
}

exp.settleCommon = function (game, cb) {
    //结算结构
    //{game: {result: consts.GAME.RESULT.x, share: x}, results: [{uid:x, actorNr:x, actualIdentity:[], result: consts.GAME.ACTOR_RESULT.x, gold: x}]}

    var results = [];

    //计算被抓股数
    if (game.gameLogic.result == consts.GAME.RESULT.RED_WIN) {
        var notFinishedActors = _.filter(game.gameLogic.black, function (act) {
            return act.isFinished == false;
        });
        game.gameLogic.share += _.size(notFinishedActors);

    }
    else if (game.gameLogic.result == consts.GAME.RESULT.BLACK_WIN) {
        var notFinishedActors = _.filter(game.gameLogic.red, function (act) {
            return act.isFinished == false;
        });
        _.map(notFinishedActors, function (act) {
            var actor = _.findWhere(game.actors, {uid: act.uid});
            switch (game.maxActor) {
                case consts.GAME.TYPE.SIX:
                    game.gameLogic.share += 1;
                    break;
                default:
                    if (_.contains(actor.gameStatus.actualIdentity, consts.GAME.ACTUAL_IDENTITY.Heart3)) {
                        game.gameLogic.share += 2;
                    }
                    else {
                        game.gameLogic.share += 1;
                    }
                    break;
            }
        });
    }
    //平局，只返回身份信息，扣除税费
    else {

    }

    //每份输赢金币数
    var partitionGold = game.base * game.gameLogic.share;


    async.waterfall([
        function (callback) {
            var actors = game.actors;

            var heart3Partition = game.maxActor == consts.GAME.TYPE.SIX ? 1 : 2;

            _.map(actors, function (actor) {
                //身份
                var isRed = !_.contains(actor.gameStatus.actualIdentity, consts.GAME.ACTUAL_IDENTITY.GUZI);
                //计算玩家输赢份数
                var partition = 0;

                if (isRed) {
                    _.map(actor.gameStatus.actualIdentity, function (id) {
                        if (id == consts.GAME.ACTUAL_IDENTITY.Heart3) {
                            partition += heart3Partition;
                        }
                        else {
                            partition += 1;
                        }
                    });
                }
                else {
                    partition = 1;
                }

                var tmpRs, tmpGold = partitionGold * partition;
                if (game.gameLogic.result == consts.GAME.RESULT.RED_WIN) {
                    if (isRed) {
                        tmpRs = consts.GAME.ACTOR_RESULT.WIN;
                    }
                    else {
                        tmpRs = consts.GAME.ACTOR_RESULT.LOSE;
                    }
                }
                else if (game.gameLogic.result == consts.GAME.RESULT.BLACK_WIN) {
                    if (isRed) {
                        tmpRs = consts.GAME.ACTOR_RESULT.LOSE;
                    }
                    else {
                        tmpRs = consts.GAME.ACTOR_RESULT.WIN;
                    }
                }
                else {
                    tmpRs = consts.GAME.ACTOR_RESULT.TIE;
                    tmpGold = 0;
                }

                results.push({
                    uid: actor.uid, actorNr: actor.actorNr, actualIdentity: actor.gameStatus.actualIdentity,
                    result: tmpRs, gold: tmpGold
                });
            });

            callback(null, results);

        }, function (results, callback) {
            //处理结算数据
            _.map(results, function (result) {
                console.log('game result => ', result)
                console.log('game result.result => ', result.result)
                if (result.result == consts.GAME.ACTOR_RESULT.WIN) {
                    pomelo.app.rpc.manager.userRemote.win(null, {uid: result.uid, roomId: game.roomId, gold: result.gold}, function (data) {
                        //callback(null, data)
                    });
                }
                else if (result.result == consts.GAME.ACTOR_RESULT.LOSE) {
                    pomelo.app.rpc.manager.userRemote.lose(null, {uid: result.uid, roomId: game.roomId, gold: result.gold * -1}, function (data) {
                        //callback(null, data)
                    });
                }
                else {
                    pomelo.app.rpc.manager.userRemote.tie(null, {uid: result.uid, roomId: game.roomId}, function (data) {
                        //callback(null, data)
                    });
                }
            });

            callback(null, {code: Code.OK});

        }], function (err, data) {
        if (err) {
            cb({code: Code.FAIL, err: err});
            return;
        }

        if (data.code == Code.FAIL) {
            cb({code: Code.FAIL, err: err});
            return;
        }

        game.channel.pushMessage(consts.EVENT.OVER, {game: {result: game.gameLogic.result, share: game.gameLogic.share}, results: results}, null, null);
        cb();
    });


}

exp.settleMatch = function () {

}



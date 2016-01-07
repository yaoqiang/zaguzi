var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger(consts.LOG.GAME);
var pomelo = require('pomelo');
var async = require('async');

var Code = require('../../../shared/code');
var _ = require('lodash');


var exp = module.exports;

exp.balance = function (game, cb) {
    exp.balanceCommon(game, cb);
}

exp.balanceCommon = function (game, cb) {
    //结算结构
    //{game: {result: consts.GAME.RESULT.x, share: x},
    // details: [{uid:x, actorNr:x, actorAvatar:x, actorName:x, actualIdentity:[], result: consts.GAME.ACTOR_RESULT.x, gold: x, roomId: game.roomId, rank: actor.gameStatus.rank}]}

    var details = [], meeting = false;


    //计算被抓股数
    if (game.gameLogic.result == consts.GAME.RESULT.RED_WIN) {
        var notFinishedActors = _.filter(game.gameLogic.black, function (act) {
            return act.isFinished == false;
        });
        game.gameLogic.share += _.size(notFinishedActors);

        //meeting?
        if (game.gameLogic.red.length == 1) meeting = true;
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
            logger.debug('计算玩家输赢具体数额.');
            var actors = game.actors;

            var heart3Partition = game.maxActor == consts.GAME.TYPE.SIX ? 1 : 2;

            _.map(actors, function (actor) {
                //身份
                var isRed = !_.contains(actor.gameStatus.actualIdentity, consts.GAME.ACTUAL_IDENTITY.GUZI);
                //计算玩家输赢份数
                var partition = 0;

                if (isRed) {
                    //map计算结果为：5人局2家3、6人局全部、7人局3家3
                    _.map(actor.gameStatus.actualIdentity, function (id) {
                        if (id == consts.GAME.ACTUAL_IDENTITY.Heart3) {
                            partition += heart3Partition;
                        }
                        else {
                            partition += 1;
                        }
                    });
                    //如果5人局1家3或7人局2家/1家3,单独处理
                    switch (game.maxActor) {
                        case consts.GAME.TYPE.FIVE:
                            //如果是1家3（即双三）
                            if (_.size(game.gameLogic.red) == 1) {
                                partition = game.maxActor - 1;
                            }
                            break;
                        case consts.GAME.TYPE.SEVEN:
                            //如果是一家3
                            if (_.size(game.gameLogic.red) == 1) {
                                partition = game.maxActor - 1;
                            }
                            //如果是2家3
                            else if (_.size(game.gameLogic.red) == 2) {
                                //如果当前玩家是单3, 则计算2份；双3计算3份
                                if (_.size(actor.gameStatus.actualIdentity) == 1) {
                                    partition = 2;
                                }
                                else {
                                    partition = 3;
                                }
                            }
                            break;
                        default:
                            break;
                    }
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

                details.push({
                    uid: actor.uid, actorNr: actor.actorNr, actorName: actor.properties.nickName,
                    actorAvatar: actor.properties.avatar, actualIdentity: actor.gameStatus.actualIdentity,
                    result: tmpRs, gold: tmpGold, roomId: game.roomId, rank: actor.gameStatus.rank,
                    meeting: meeting && actor.gameStatus.identity == consts.GAME.IDENTITY.HONG3
                });
            });

            callback(null, details);

        }, function (details, callback) {

            logger.debug('调用用户服务器进行结算.');
            //处理结算数据
            pomelo.app.rpc.manager.userRemote.balance(null, {details: details}, function() {
                callback(null, {code: Code.OK});
            });

        }, function (result, callback) {
            logger.debug('game over, 如果有掉线玩家，此时结算结束将玩家离开房间，从缓存移除');
            var uids = _.pluck(details, 'uid');
            pomelo.app.rpc.manager.userRemote.getUsersCacheByUids(null, {uids: uids}, function (users) {
                _.map(users, function(u) {
                    if (_.isNull(u.sessionId)) {
                        logger.debug('移除掉线玩家：%j', u.uid);
                        pomelo.app.rpc.manager.userRemote.onUserDisconnect(null, {uid: u.uid}, function () {

                        });
                    }
                });
            });
            callback(null, result);
        }], function (err, data) {
        if (err) {
            cb({code: Code.FAIL, err: err});
            return;
        }

        if (data.code == Code.FAIL) {
            cb({code: Code.FAIL, err: err});
            return;
        }

        cb({details: _.sortBy(details, 'rank')});
    });


}

exp.balanceMatch = function () {

}



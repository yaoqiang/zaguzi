
var _ = require('lodash');
var pomelo = require('pomelo-rt');

var consts = require('../consts/consts');
var Code = require('../../../shared/code');

var logger = require('log4js').getLogger(consts.LOG.GAME);
var loggerErr = require('log4js').getLogger(consts.LOG.ERROR);

var async = require('async');

var eventManager = require('../domain/event/eventManager');


var balanceService = module.exports;

balanceService.balance = function (game, cb) {
    balanceService.balanceCommon(game, cb);
}

balanceService.balanceCommon = function (game, cb) {
    //结算结构
    //{game: {result: consts.GAME.RESULT.x, share: x},
    // details: [{uid:x, actorNr:x, actorAvatar:x, actorName:x, actualIdentity:[], result: consts.GAME.ACTOR_RESULT.x, 
    //  gold: x, roomId: game.roomId, rank: actor.gameStatus.rank, meeting: true/false}]}

    var details = [], meeting = false;

    //如果不是认输, 才计算被抓股数; 如果是认输, 在game.giveUp函数中已为share赋值为1
    if (!game.gameLogic.isGiveUp) {
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
                    //map计算结果为：5人局2家3、6人局3家3、7人局3家3...(常规局:3分别在不同玩家手里,玩家没有手握2个3以上的)
                    _.map(actor.gameStatus.actualIdentity, function (id) {
                        if (id == consts.GAME.ACTUAL_IDENTITY.Heart3) {
                            partition += heart3Partition;
                        }
                        else {
                            partition += 1;
                        }
                    });
                    //如果5人局1家3, 6人局2家3, 7人局2家/1家3, 单独处理
                    switch (game.maxActor) {
                        case consts.GAME.TYPE.FIVE:
                            //如果是1家3（即双三）
                            if (_.size(game.gameLogic.red) == 1) {
                                partition = game.maxActor - 1;
                            }
                            break;
                        case consts.GAME.TYPE.SIX:
                            if (_.size(game.gameLogic.red) == 1) {
                                partition = game.maxActor - 1;
                            }
                            else if (_.size(game.gameLogic.red) == 2) {
                                partition = 2;
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
                    result: tmpRs, gold: tmpGold, roomId: game.roomId, gameId: game.gameId, rank: actor.gameStatus.rank,
                    meeting: meeting && !_.contains(actor.gameStatus.actualIdentity, consts.GAME.ACTUAL_IDENTITY.GUZI)
                });
            });

            callback(null, details);

        }, function (details, callback) {

            logger.debug('游戏结束, 调用用户服务器进行结算, 后续任务等逻辑处理');

            //处理结算数据
            pomelo.app.rpc.manager.userRemote.balance(null, {
                gameRecord: {
                    lobby: game.lobbyId,
                    roomId: game.roomId,
                    gameId: game.gameId,
                    result: game.gameLogic.result,
                    share: game.gameLogic.share,
                    meeting: meeting
                },
                details: details
            }, function () {
                callback(null, {code: Code.OK});
            });

        }, function (result, callback) {
            logger.debug('结算结束, 如果有掉线玩家，此时结算结束将玩家离开房间，从缓存移除');
            var uids = _.pluck(details, 'uid');
            loggerErr.debug('%j', {method: "service.balanceService.balanceCommon", uids: uids, desc: '结算结束, 如果有掉线玩家，此时结算结束将玩家离开房间，从缓存移除'});
            pomelo.app.rpc.manager.userRemote.getUsersCacheByUids(null, {uids: uids}, function (users) {
                _.map(users, function (u) {
                    if (_.isNull(u.sessionId)) {
                      
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

balanceService.balanceMatch = function () {

}



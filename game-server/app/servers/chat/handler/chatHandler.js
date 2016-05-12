var consts = require('../../../consts/consts');

var Code = require('../../../../../shared/code');
var SCOPE = require('../../../consts/consts').CHAT_SCOPE;
var channelUtil = require('../../../util/channelUtil');
var gameUtil = require('../../../util/gameUtil');
var logger = require('log4js').getLogger(consts.LOG.GAME);
var loggerErr = require('log4js').getLogger(consts.LOG.ERROR);
var utils = require('../../../util/utils');
var pomelo = require('pomelo-rt');
var _ = require('lodash');


module.exports = function (app) {
    return new ChannelHandler(app, app.get('chatService'));
};

var ChannelHandler = function (app, chatService) {
    this.app = app;
    this.chatService = chatService;
};

function setContent(str) {
    str = str.replace(/<\/?[^>]*>/g, '');
    str = str.replace(/[ | ]*\n/g, '');
    return str.replace(/\n[\s| | ]*\r/g, '');
}

ChannelHandler.prototype.send = function (msg, session, next) {
    var self = this;
    var scope, content, channelName, uid, code;
    msg.uid = session.uid;
    scope = msg.scope;
    channelName = getChannelName();
    utils.myPrint('channelName = ', channelName);
    msg.content = utils.setContent(msg.content);
    msg.content = utils.replaceContent(msg.content);
    if (scope !== SCOPE.PRIVATE) {
        utils.myPrint('ByChannel ~ msg = ', JSON.stringify(msg));
        utils.myPrint('ByChannel ~ scope = ', scope);
        // utils.myPrint('ByChannel ~ content = ', JSON.stringify(content));
        utils.myPrint('ByChannel ~ msg.gameId = ', msg.gameId);
        //牌局内聊天
        if (scope === SCOPE.GAME) {
            var args = {gameId: msg.gameId, content: content};
            utils.myPrint('ByChannel ~ args = ', JSON.stringify(args));

            // 牌局聊天参数
            // uid: data.uid,
            // gameId: data.gameId,
            // type: data.type,
            // item: data.item,
            // content: data.content

            pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, msg.uid, function (user) {
                if (user == undefined || user == null) {
                    logger.debug('game||chat||发送聊天失败, 玩家已下线||用户&ID: %j', user.uid);
                    next({code: Code.FAIL, err: consts.ERR_CODE.CHAT.NOT_INT_GAME});
                    return;
                }

                if (user.gameId == null) {
                    logger.debug('game||chat||发送聊天失败, 玩家不在牌桌中||用户&ID: %j', user.uid);
                    next({code: Code.FAIL, err: consts.ERR_CODE.CHAT.NOT_INT_GAME});
                    return;
                }

                //rpc invoke
                var chatParams = {
                    namespace: 'user',
                    service: 'gameRemote',
                    method: 'chat',
                    args: [msg]
                };

                var room = gameUtil.getRoomById(user.roomId);

                pomelo.app.rpcInvoke(room.serverId, chatParams, function (result) {
                    next();
                });
            });


        }
        //小喇叭，检查玩家是否有喇叭, 如果没有提示失败, 如果有则发送并扣除喇叭数
        else {
            pomelo.app.rpc.manager.userRemote.getUserCacheByUid(null, msg.uid, function (user) {
                if (user == undefined || user == null) {
                    logger.debug('game||chat||发送喇叭失败, 玩家已下线||用户&ID: %j', user.uid);
                    next({code: Code.FAIL, err: consts.ERR_CODE.CHAT.NOT_INT_GAME});
                    return;
                }


                var trumpetCount = 0;
                _.each(user.player.items, function (item) {
                    if (item.id == 2) {
                        trumpetCount = item.value;
                    }
                });

                if (trumpetCount == 0) {
                    logger.debug('game||chat||发送喇叭失败, 玩家喇叭数不够||用户&ID: %j', user.uid);
                    next({code: Code.FAIL, err: consts.ERR_CODE.CHAT.NOT_INT_GAME});
                    return;
                }

                content = {from: user.player.nickName, msg: msg.content};

                pomelo.app.rpc.manager.userRemote.consumeTrumpet(null, {
                    uid: msg.uid,
                    value: msg.value || 1
                }, function (result) {
                    if (result.code == Code.FAIL) {
                        next(null, {code: result.code});
                        return;
                    }

                    self.chatService.pushByChannel(channelName, content, function (err, res) {
                        if (err) {
                            loggerErr.error(err.stack);
                            code = Code.FAIL;
                        } else if (res) {
                            code = res;
                        } else {
                            code = Code.OK;
                        }

                        next(null, {code: code});
                    });
                });


            });


        }
    }
    // 私人聊天
    else {
        utils.myPrint('Private ~ scope = ', scope);
        utils.myPrint('Private ~ content = ', JSON.stringify(content));
        this.chatService.pushByPlayerName(msg.toName, content, function (err, res) {
            if (err) {
                loggerErr.error(err.stack);
                code = Code.FAIL;
            } else if (res) {
                code = res;
            } else {
                code = Code.OK;
            }
            next(null, {code: code});
        });
    }
};

var getChannelName = function () {
    return channelUtil.getGlobalChannelName();
};
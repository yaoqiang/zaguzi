var GameUtil = module.exports;

var rooms = require('../../config/data/room');
var consts = require('../consts/consts');
var Code = require('../../../shared/code');
var _ = require('lodash');

GameUtil.getRoomsByLobbyId = function (lobbyId) {

    return _.where(_.flatten(rooms), {lobbyId: lobbyId});

}

GameUtil.getRoomById = function (id) {
    return _.find(_.flatten(rooms), {id: id});
}

GameUtil.getJoinAvailable = function (roomId, player) {
    if (player.gameId && player.gameId != undefined) {
        return false;
    }

    var room = this.getRoomById(roomId);
    //加入房间前检查
    if (player.gold < consts.GLOBAL.JOIN_MIN_GOLD) {
        return {code: Code.FAIL, err: consts.ERR_CODE.JOIN.TOO_POOR};
    }
    
    if (player.gold > room.max) {
        return {code: Code.FAIL, err: consts.ERR_CODE.JOIN.TOO_RICH};
    }
    
    if (player.gold < room.min) {
        return {code: Code.FAIL, err: consts.ERR_CODE.JOIN.TOO_POOR};
    }
    
    return {code: Code.OK};

}
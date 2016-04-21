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

/**
 * 检查玩家金币是否能加入
 * @param roomId
 * @param player
 * @returns {*}
 */
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

/**
 * 计算剩余牌
 * @param originalCards [] 全部剩余牌记录
 * @param holdingCards [] 手牌
 */
GameUtil.caculateRemainingCards = function (originalCards, holdingCards) {
    return _.difference(originalCards, holdingCards);
}

/**
 * 获得道具是否存在并且有效（count>0 || term > now）
 * @param item {id: Int} 物品ID
 * @return true/false
 */
GameUtil.isItemExistAndNotExpired = function (playerItems, item) {
    if (_.isNull(playerItems) || _.isUndefined(playerItems)) {
        return false;
    }

    if (!_.isArray(playerItems)) {
        return false;
    }

    if (playerItems.length <= 0) {
        return false;
    }

    var existItem = _.findWhere(playerItems, {id: item.id});
    
    if (_.isUndefined(existItem)) return false;
    
    if (existItem.mode === consts.GLOBAL.ITEM_MODE.TERM) {
        //如果已过期, 则代表没有
        if (new Date(existItem.value).isBefore(new Date())) {
            return false;
        } 
        return true;
    }
    if (existItem.value <= 0) return false;
    
    return true;
}
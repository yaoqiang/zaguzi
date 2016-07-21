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
 * 检查玩家金币是否能加入
 * @param roomId
 * @param player
 * @returns {*}
 */
GameUtil.getJoinAvailableForPrivate = function (base, player) {
    var min = GameUtil.getMinByBaseForPrivateRoom(base);
    //加入房间前检查
    if (player.gold < consts.GLOBAL.JOIN_MIN_GOLD) {
        return {code: Code.FAIL, err: consts.ERR_CODE.JOIN.TOO_POOR};
    }
    
    if (player.gold > 999999999) {
        return {code: Code.FAIL, err: consts.ERR_CODE.JOIN.TOO_RICH};
    }
    
    if (player.gold < min) {
        return {code: Code.FAIL, err: consts.ERR_CODE.JOIN.TOO_POOR};
    }
    
    return {code: Code.OK};

}

GameUtil.getMinByBaseForPrivateRoom = function (base) {
    var min = 1000;
    if (base == 1000) {
        min = 10000;
    }
    else if (base == 5000) {
        min = 30000;
    }
    return min;
}

/**
 * 计算剩余牌
 * @param originalCards [] 全部剩余牌记录
 * @param holdingCards [] 手牌
 * @return [{modValue: card%100, count: Int}, {}, ...]
 */
GameUtil.calculateRemainingCards = function (originalCards, holdingCards) {
    var remainingCards = _.difference(originalCards, holdingCards);
    return _.reduce(remainingCards, function (memo, card) {
        if (memo.length > 0) {
            var exist = _.findWhere(memo, {modValue: card % 100});
            if (!_.isUndefined(exist)) {
                exist.count += 1;
            }
            else {
                memo.push({modValue: card % 100, count: 1});
            }
            return memo;
        }
        memo.push({modValue: card % 100, count: 1});
        return memo;
    }, []);
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
        console.log('new Date(existItem.value).isBefore(new Date()) === ', new Date(existItem.value), new Date(), new Date(existItem.value).isBefore(new Date()))
        if (new Date(existItem.value).isBefore(new Date())) {
            return false;
        } 
        return true;
    }
    if (existItem.value <= 0) return false;
    
    return true;
}
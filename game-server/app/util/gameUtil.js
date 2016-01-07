var GameUtil = module.exports;

var rooms = require('../../config/data/room');
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
    //some check..

}
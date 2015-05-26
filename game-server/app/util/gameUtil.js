var GameUtil = module.exports;

var rooms = require('../../config/data/room');
var _ = require('underscore');

GameUtil.getRoomsByLobbyId = function (lobbyId) {

    return _.where(_.flatten(rooms), {lobbyId: lobbyId});

}

GameUtil.getRoomById = function (id) {
    return _.find(_.flatten(rooms), {id: id});
}
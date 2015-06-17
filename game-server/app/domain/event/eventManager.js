var pomelo = require('pomelo');

var exp = module.exports;

/**
 * Listen event for entity
 */
exp.addEvent = function (entity) {
    addSaveEvent(entity);
};

/**
 * Add save event for player
 * @param {Object} player The player to add save event for.
 */
function addSaveEvent(player) {
    console.log(player);
    var app = pomelo.app;
    player.on('saveInfo', function () {
        app.get('sync').exec('playerSync.updatePlayerInfo', player.uid, player);
    });

    player.on('save', function () {
        app.get('sync').exec('playerSync.update', player.uid, player);
    });

    player.on('flush', function () {
        app.get('sync').flush('playerSync.update', player.uid, player);
    });

    player.properties.on('save', function () {
        app.get('sync').exec('propertiesSync.update', player.uid, player.properties);
    });

    player.properties.on('flush', function () {
        app.get('sync').flush('propertiesSync.update', player.uid, player.properties);
    });

}

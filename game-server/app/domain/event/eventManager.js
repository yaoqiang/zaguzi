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
    var app = pomelo.app;
    player.on('saveProfile', function () {
        app.get('sync').exec('playerSync.updatePlayerProfile', player.uid, player);
    });

    player.on('save', function () {
        app.get('sync').exec('playerSync.update', player.uid, player);
    });

    player.on('saveTask', function () {
        app.get('sync').exec('taskSync.update', player.uid, player);
    });

    player.on('saveItem', function () {
        app.get('sync').exec('itemSync.update', player.uid, player);
    });

    player.on('flush', function () {
        app.get('sync').flush('playerSync.update', player.uid, player);
    });

    player.on('saveProperties', function () {
        app.get('sync').exec('propertiesSync.update', player.uid, player);
    });

    player.on('flushProperties', function () {
        app.get('sync').flush('propertiesSync.update', player.uid, player);
    });

    player.on('saveAll', function () {
        app.get('sync').exec('playerSync.update', player.uid, player);
        app.get('sync').exec('propertiesSync.update', player.uid, player);
        app.get('sync').exec('taskSync.update', player.uid, player);
        app.get('sync').exec('itemSync.update', player.uid, player);
    });

    player.on('flushAll', function () {
        app.get('sync').flush('playerSync.update', player.uid, player);
        app.get('sync').flush('propertiesSync.update', player.uid, player);
        app.get('sync').flush('taskSync.update', player.uid, player);
        app.get('sync').flush('itemSync.update', player.uid, player);
    })

}

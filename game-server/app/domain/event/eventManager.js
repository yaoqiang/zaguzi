var pomelo = require('pomelo-rt');

var exp = module.exports;

var EVENT = {
    HIGHLIGHT_PROFILE: 'HIGHLIGHT_PROFILE',
    HIGHLIGHT_DAILY_TODO: 'HIGHLIGHT_DAILY_TODO',
    HIGHLIGHT_SYSTEM_MAIL: 'HIGHLIGHT_SYSTEM_MAIL',
    HIGHLIGHT_SETTING: 'HIGHLIGHT_SETTING',
    HIGHLIGHT_SHOP: 'HIGHLIGHT_SHOP',
    HIGHLIGHT_RANKING_LIST: 'HIGHLIGHT_RANKING_LIST',
    HIGHLIGHT_TASK: 'HIGHLIGHT_TASK',
    HIGHLIGHT_EXCHANGE: 'HIGHLIGHT_EXCHANGE',
    HIGHLIGHT_ACTIVITY: 'HIGHLIGHT_ACTIVITY',
    ALERT_DAILY_TODO: 'ALERT_DAILY_TODO',
    ALERT_BANKRUPTCY_IN_GAME: 'ALERT_BANKRUPTCY_IN_GAME',
    ALERT_QUICK_RECHARGE: 'ALERT_QUICK_RECHARGE',
    
}

/**
 * Listen player event
 */
exp.addPlayerEvent = function (entity) {
    addPlayerSaveEvent(entity);
};

/**
 * Add save event for player
 * @param {Object} player The player to add save event for.
 */
function addPlayerSaveEvent(player) {
    var app = pomelo.app;
    player.on('saveProfile', function () {
        app.get('sync').exec('playerSync.updatePlayerProfile', player.uid, player);
    });

    //player基本信息(战绩之类)
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
    
    player.on('saveOnEnter', function () {
        app.get('sync').exec('propertiesSync.update', player.uid, player);
        app.get('sync').exec('taskSync.update', player.uid, player);
    })

    player.on('saveAll', function () {
        app.get('sync').exec('playerSync.update', player.uid, player);
        app.get('sync').exec('propertiesSync.update', player.uid, player);
        app.get('sync').exec('taskSync.update', player.uid, player);
        app.get('sync').exec('itemSync.update', player.uid, player);
        app.get('sync').exec('playerSync.updatePlayerProfile', player.uid, player);
    });

    player.on('flushAll', function () {
        app.get('sync').flush('playerSync.update', player.uid, player);
        app.get('sync').flush('propertiesSync.update', player.uid, player);
        app.get('sync').flush('taskSync.update', player.uid, player);
        app.get('sync').flush('itemSync.update', player.uid, player);
        app.get('sync').flush('playerSync.updatePlayerProfile', player.uid, player);
    })

}

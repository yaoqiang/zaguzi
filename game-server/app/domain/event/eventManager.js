var pomelo = require('pomelo-rt');
var consts = require('../../consts/consts');
var messageService = require('../../services/messageService');
var dispatcher = require('../../util/dispatcher').dispatch;
var _ = require('lodash');


var exp = module.exports;



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

    //player基本信息(金币，战绩之类)
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

    //player基本信息(昵称，头像，签名，性别类)
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
    });



    //UI事件暂时不需要, 设计有些复杂了,粒度太小了
    player.on(consts.EVENT.UI_ON_ENTRY_WRAPPER, function (args) {

    });

    player.on(consts.EVENT.UI_HIGHLIGHT_DAILY_TODO, function () {

    });

    player.on(consts.EVENT.UI_HIGHLIGHT_SYSTEM_MAIL, function () {

    });

    player.on(consts.EVENT.UI_HIGHLIGHT_SETTING, function () {

    });

    player.on(consts.EVENT.UI_UI_HIGHLIGHT_SHOP, function () {

    });

    player.on(consts.EVENT.UI_HIGHLIGHT_RANKING_LIST, function () {

    });

    player.on(consts.EVENT.UI_HIGHLIGHT_TASK, function () {

    });

    player.on(consts.EVENT.UI_HIGHLIGHT_EXCHANGE, function () {

    });

    player.on(consts.EVENT.UI_HIGHLIGHT_ACTIVITY, function () {

    });

    player.on(consts.EVENT.UI_ALERT_DAILY_TODO, function () {

    });

    player.on(consts.EVENT.UI_ALERT_BANKRUPTCY_IN_GAME, function () {

    });

    player.on(consts.EVENT.UI_ALERT_QUICK_RECHARGE, function () {

    });

}

var dispatcher = require('../../../util/dispatcher');

module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

var handler = Handler.prototype;

/**
 * Gate handler that dispatch user to connectors.
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param {Function} next next stemp callback
 *
 */
handler.queryEntry = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {
            code: 500
        });
        return;
    }
    // get all connectors
    var connectors = this.app.getServersByType('connector');
    if(!connectors || connectors.length === 0) {
        next(null, {
            code: 500
        });
        return;
    }
    // select connector
    var res = dispatcher.dispatch(uid, connectors);

    if (res.host.indexOf('101.200.128.237') > -1) {
        res.host = 'test.apigame4.zaguzi.com';
    }
    else if (res.host.indexOf('101.201.154.38') > -1) {
        res.host = 'apigame4.zaguzi.com';
    }

    next(null, {
        code: 200,
        host: res.host,
        port: res.clientPort
    });
};

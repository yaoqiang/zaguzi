var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');
var sync = require('pomelo-sync-plugin');
var log4js = require('log4js');
var log4jsConf = require('./config/log4jsCustom.json');

var consts = require('./app/consts/consts');
var logger = require('log4js').getLogger(consts.LOG.SYSTEM);

var ChatService = require('./app/services/chatService');

var onlineUserAnalysis = require('./app/components/onlineUserAnalysis');


/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'zgz');

// app configuration
app.configure('production|development', 'connector', function () {
    app.set('connectorConfig', {
        connector: pomelo.connectors.hybridconnector,
        ////websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
        //  transports: {
        //      transports: ['websocket'],
        //      'close timeout': 60,
        //      'heartbeat interval': 10,
        //      'heartbeat timeout': 30
        //  },
        heartbeat: 100, //10 minute
        disconnectOnTimeout: true,
        useDict: true,
        useProtobuf: true,
        handshake: function (msg, cb) {
            cb(null, {heartbeat: 100, handshakeTime: new Date()});
        }
    });
});

app.configure('production|development', 'gate', function () {
    app.set('connectorConfig', {
        connector: pomelo.connectors.hybridconnector,
        useProtobuf: true
    });
});

app.configure('production|development', 'auth', function () {
    app.set('connectorConfig', {
        connector: pomelo.connectors.hybridconnector,
        useProtobuf: true
    });
});

app.configure('production|development', 'manager', function () {
    app.set('connectorConfig', {
        connector: pomelo.connectors.hybridconnector,
        useProtobuf: true
    });
});

// app configure
app.configure('production|development', function () {

    app.before(pomelo.filters.toobusy());


    //app.enable('systemMonitor');


    // proxy configures
    app.set('proxyConfig', {
        cacheMsg: true,
        interval: 30,
        lazyConnection: true
        // enableRpcLog: true
    });

    // remote configures
    app.set('remoteConfig', {
        cacheMsg: true,
        interval: 30
    });

    // filter configures
    app.filter(pomelo.filters.timeout());

    //custom log conf
    log4js.configure(log4jsConf, {});

});

app.configure('production|development', 'game', function () {
    app.set('connectorConfig', {
        connector: pomelo.connectors.hybridconnector,
        useProtobuf: true
    });

    app.route('game', routeUtil.game);

});


// configure database
app.configure('production|development', 'auth|connector|manager', function () {
    var dbclient = require('./app/dao/mongodb');

    dbclient.on('error', function (err) {
        console.log('database error', err)
    })

    dbclient.on('connect', function () {
        console.log('database connected')
    })

    app.set('dbclient', dbclient);

    app.use(sync, {
        sync: {
            path: __dirname + '/app/dao/mapping',
            dbclient: dbclient
        }
    });

    app.set('errorHandler', function (err, msg, resp, session, cb) {
        console.log('errorHandler => ', err, msg);
    });
});

app.configure('production|development', 'manager', function () {
    app.load(onlineUserAnalysis, {});
    require('./app/http/httpServer')(app, {});
    //
    app.userCache = [];

});

// Configure for chat server
app.configure('production|development', 'chat', function () {
    app.set('chatService', new ChatService(app));
});

// start app
app.start();

process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
    logger.error(' Caught exception: %j', {err: err.stack});
});

var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');
var sync = require('pomelo-sync-plugin');


/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'zgz');

// app configuration
app.configure('production|development', 'connector', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.hybridconnector,
      //websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
      transports : ['websocket'],
      heartbeat : 30,
      useDict : true,
      useProtobuf : true,
      handshake : function(msg, cb){
          cb(null, {});
      }
    });
});

app.configure('production|development', 'gate', function(){
    app.set('connectorConfig',
        {
            connector : pomelo.connectors.hybridconnector,
            useProtobuf : true
        });
});

app.configure('production|development', 'auth', function(){
    app.set('connectorConfig',
        {
            connector : pomelo.connectors.hybridconnector,
            useProtobuf : true
        });
});

// app configure
app.configure('production|development', function() {
    // route configures
    app.route('chat', routeUtil.chat);

    app.before(pomelo.filters.toobusy());
    app.enable('systemMonitor');

    var lobbyInfo = require('./app/modules/lobbyInfo');
    var onlineUser = require('./app/modules/onlineUser');
    if(typeof app.registerAdmin === 'function'){
        app.registerAdmin(lobbyInfo, {app: app});
        app.registerAdmin(onlineUser, {app: app});
    }

    app.userCache = [];

    // filter configures
    app.filter(pomelo.filters.timeout());
});



app.configure('production|development', 'game', function(){
    app.set('connectorConfig',
        {
            connector : pomelo.connectors.hybridconnector,
            useProtobuf : true
        });

    app.route('game', routeUtil.game);

});


// configure database
app.configure('production|development', 'auth|chat|connector|game|manager|master', function () {
    app.loadConfig('mysql', app.getBase() + '/../shared/config/mysql.json');
    var dbclient = require('./app/dao/mysql/mysql').init(app);
    app.set('dbclient', dbclient);

    app.use(sync, {sync: {path:__dirname + '/app/dao/mapping', dbclient: dbclient}});
})

// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});

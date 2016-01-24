var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');
var sync = require('pomelo-sync-plugin');
var logger = require('pomelo-logger');
var log4jsConf = require('./config/log4js.json')

var onlineUserAnalysis = require ('./app/components/onlineUserAnalysis');


/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'zgz');

// app configuration
app.configure('production|development', 'connector', function() {
  app.set('connectorConfig', {
    connector: pomelo.connectors.hybridconnector,
    ////websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
    //  transports: {
    //      transports: ['websocket'],
    //      'close timeout': 60,
    //      'heartbeat interval': 10,
    //      'heartbeat timeout': 30
    //  },
    heartbeat: 300,
    disconnectOnTimeout: true,
    useDict: true,
    useProtobuf: true,
    handshake: function(msg, cb) {
      cb(null, {});
    }
  });
});

app.configure('production|development', 'gate', function() {
  app.set('connectorConfig', {
    connector: pomelo.connectors.hybridconnector,
    useProtobuf: true
  });
});

app.configure('production|development', 'auth', function() {
  app.set('connectorConfig', {
    connector: pomelo.connectors.hybridconnector,
    useProtobuf: true
  });
});

app.configure('production|development', 'manager', function() {
  app.set('connectorConfig', {
    connector: pomelo.connectors.hybridconnector,
    useProtobuf: true
  });
});

// app configure
app.configure('production|development', function() {

  app.before(pomelo.filters.toobusy());


  //app.enable('systemMonitor');

  //var lobbyInfo = require('./app/modules/lobbyInfo');
  //var onlineUser = require('./app/modules/onlineUser');
  //if (typeof app.registerAdmin === 'function') {
  //  app.registerAdmin(lobbyInfo, {
  //    app: app
  //  });
  //  app.registerAdmin(onlineUser, {
  //    app: app
  //  });
  //}

  app.userCache = [];

  // filter configures
  app.filter(pomelo.filters.timeout());

  //log conf
  //logger.configure(log4jsConf);

});

app.configure('production|development', 'game', function() {
  app.set('connectorConfig', {
    connector: pomelo.connectors.hybridconnector,
    useProtobuf: true
  });

  app.route('game', routeUtil.game);

});


// configure database
app.configure('production|development', 'auth|connector|manager', function() {
  var dbclient = require('./app/dao/mongodb');

  dbclient.on('error', function(err) {
    console.log('database error', err)
  })

  dbclient.on('connect', function() {
    console.log('database connected')
  })

  app.set('dbclient', dbclient);

  app.use(sync, {
    sync: {
      path: __dirname + '/app/dao/mapping',
      dbclient: dbclient
    }
  });

  app.set('errorHandler', function(err, msg, resp, session, cb) {
    console.log('errorHandler => ', err, msg);
  });
});

app.configure ('production|development', 'manager', function() {
  app.load (onlineUserAnalysis, {});
  require('./app/util/httpServer')(app, {});

});

// start app
app.start();

process.on('uncaughtException', function(err) {
  console.error(' Caught exception: ' + err.stack);
});

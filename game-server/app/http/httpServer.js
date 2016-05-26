var http = require('http');
var port = 1337;
var timeoutNumber = 100000;
var username = 'gm-bob';
var passwd = 'abcdefg';
var qs = require('querystring');
var fs = require('fs');
var path = require('path');

//express
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var timeout = require('connect-timeout');



var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"
};

//////////////////////////////
// 为游戏服务器外部应用提供调用
//////////////////////////////

module.exports = function (app, opts) {
    (new HttpServer(app, opts)).start();
};

var HttpServer = function (app, opts) {
    this.app = app;
    this.name = '__httpdebug__';
    this.userDicPath = null;
    this.opts = opts;
};

var server = null;

HttpServer.prototype.start = function () {
    httpStart(this.app);
};

var httpStop = function () {
    server.close(function () {
        console.log(' http server stop port ' + port);
        server = null;
    });
}

var httpStart = function (app) {
    
    server = express();
    
    server.use(session({
        secret: 'zaguzi!!!',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 60000 }
    }));

    // parse application/x-www-form-urlencoded
    server.use(bodyParser.urlencoded({ extended: false }))

    // parse application/json
    server.use(bodyParser.json())

    //设置跨域访问
    server.all('*', function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Token");
        res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        res.header("X-Powered-By", ' 4.13.3')
        res.header("Content-Type", "application/json; charset=utf-8");
        next();
    });


    //router
    server.use('/callback/apix', require('./controller/APiXController')(app));
    server.use('/pingpp/webhooks', require('./controller/PingppController')(app));
    server.use('/api/game', require('./controller/GameController')(app));


    //root path
    server.get('/', function(req, res) {
        res.send('Hello form root route.');
    });
    
    server.listen(port);
    
    server.use(timeout(timeoutNumber));
    server.use(haltOnTimedout);
    function haltOnTimedout(req, res, next){
        if (!req.timedout) next();
    }
    
    console.log('Http server start at port ' + port);
}

process.on('SIGUSR1', function () {
    if (server === null) {
        httpStart();
    } else {
        httpStop();
    }
});

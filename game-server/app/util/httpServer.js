var http = require('http');
var port = 1337;
var timeout = 100000;
var username = 'gm-bob';
var passwd = 'abcdefg';
var qs = require('querystring');
var fs = require('fs');
var path = require('path');
var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"
};

/////////////////////////
// 为游戏服务器外部应用提供调用
/////////////////////////

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
    server = http.createServer(function (req, res) {
        res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
        if (req.method === "GET") {

        }
        if (req.method == 'POST') {
            var body = '';
            req.on('data', function (data) {
                body += data;
            });
            req.on('end', function () {
                var params = qs.parse(body);
                if (params.passwd !== passwd) {
                    res.writeHead(403, "forbid", {'Content-Type': 'text/json'});
                    return res.end('wrong passwd');
                }
                var result = 'ok'
                try {
                    result = eval(params.script);
                } catch (ex) {
                    result = ex.stack;
                }
                res.writeHead(200, "OK", {'Content-Type': 'text/json'});
                return res.end(JSON.stringify(result));
            });
        }
    })
    server.listen(port);
    server.addListener("connection", function (socket) {
        socket.setTimeout(timeout);
    });
    console.log('Http server start at port ' + port);
}

process.on('SIGUSR1', function () {
    if (server === null) {
        httpStart();
    } else {
        httpStop();
    }
});

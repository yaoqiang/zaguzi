var express = require('express');
var Token = require('../shared/token');
var secret = require('../shared/config/session').secret;
var app = express();
var everyauth = require('./lib/oauth');

var db = require('./lib/mongodb');

var log4js = require('log4js');
var logger = log4js.getLogger();

var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');

app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(__dirname + '/public'));

// Populates req.session
app.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: 'keyboard cat'
}));

//设置跨域访问
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 4.13.3')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});


app.get('/auth_success', function (req, res) {
    if (req.session.userId) {
        var token = Token.create(req.session.userId, Date.now(), secret);
        res.render('auth', {
            code: 200,
            token: token,
            uid: req.session.userId
        });
    } else {
        res.render('auth', {
            code: 500
        });
    }
});


app.post('/login', function (req, res) {
    var msg = req.body;

    var username = msg.username;
    var pwd = msg.password;

    if (!username || !pwd) {
        res.send({
            code: 1003
        });
        return;
    }

    db.user.findOne({
        username: username
    }, function (err, user) {
        if (err || !user) {
            logger.warn('用户名不存在! username: ' + username);
            res.jsonp({
                code: 1001
            });
            return;
        }

        if (pwd !== user.password) {
            // TODO code
            // password is wrong
            logger.warn('用户密码错误! username: ' + username);
            res.jsonp({
                code: 1002
            });
            return;
        }

        logger.info(username + ' 登录成功!');
        res.jsonp({
            code: 200,
            token: Token.create(user._id, Date.now(), secret),
            uid: user._id
        });
    });


});

app.get('/signup', function (req, res) {
    res.render('signup', {
        title: 'Signup'
    });
});

app.post('/register', function (req, res) {
    var msg = req.body;
    if (!msg.username || !msg.password) {
        res.send({
            code: 500
        });
        return;
    }

    db.user.ensureIndex({ username: 1 });

    db.user.findOne({
        username: msg.username
    }, function (err, doc) {
        if (err || doc) {
            if (err) {
                logger.error(err);
                res.send({
                    code: 501
                });
            } else {
                res.send({
                    code: 500,
                    message: '用户名已存在'
                });
            }
            return;
        }
        var now = Date.now();
        var user = {
            username: msg.username,
            password: msg.password,
            loginCount: 0,
            createdAt: now
        };
        db.user.save(user, function (err, doc) {
            logger.info('A new user was created! --' + msg.username);
            res.send({
                code: 200,
                token: Token.create(doc._id, Date.now(), secret),
                uid: doc._id
            });
        });

    });


});


app.listen(3001);

// Uncaught exception handler
process.on('uncaughtException', function (err) {
    logger.error(' Caught exception: ' + err.stack);
});

db.on('error', function (err) {
    console.log('database error', err)
})

db.on('connect', function () {
    console.log('database connected')
})

logger.info("Web server has started.");
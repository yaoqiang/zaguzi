var express = require('express');
var Token = require('../shared/token');
var secret = require('../shared/config/session').secret;
var app = express();
//var everyauth = require('./lib/oauth');

var mongojs = require('mongojs');
var db = require('./lib/mongodb');

var log4js = require('log4js');
var logger = log4js.getLogger();

var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');

var passwordHash = require('password-hash');

app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
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
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Token");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 4.13.3')
    res.header("Content-Type", "application/json; charset=utf-8");
    next();
});


app.post('/autoLogin', function (req, res) {
    var password = Math.floor(Math.random() * (999999 - 100000) + 100000);
    var user = {
        username: '',
        password: passwordHash.generate(password.toString()),
        loginCount: 1,
        lastLoginAt: new Date(),
        createdAt: new Date()
    };
    db.user.save(user, function (err, doc) {
        logger.debug('A new user was created! --' + doc._id);
        db.user.update(
            {
                _id: mongojs.ObjectId(doc._id)
            },
            {
                $set: {
                    username: doc._id
                }
            },
            function (err, updateResult) {
                if (err) {
                    res.send({ code: 500, err: '' })
                }
                res.send({
                    code: 200,
                    token: Token.create(doc._id, Date.now(), password.toString(), secret),
                    uid: doc._id
                });
            }
            );

    });
});


app.post('/loginByToken', function (req, res) {
    var data = req.body;
    if (!data.token) {
        res.send({
            code: 1003
        });
        return;
    }

    console.log('token -> ', data.token);
    
    //result: [uid, timestamp, password]
    var result = Token.parse(data.token, secret);
    if (result == null) {
        res.send({
            code: 1002
        });
        return;
    }

    console.log('result -> ', result);

    var uid = result.uid, password = result.password;

    db.user.findOne({
        _id: mongojs.ObjectId(uid)
    }, function (err, user) {
        if (err || !user) {
            logger.warn('用户不存在! uid: ' + uid);
            res.jsonp({
                code: 1001
            });
            return;
        }

        //密码validate
        if (!passwordHash.verify(password.toString(), user.password.toString())) {
            // password is wrong
            logger.warn('用户密码错误! uid: ' + uid);
            res.jsonp({
                code: 1002
            });
            return;
        }

        db.user.update(
            {
                _id: mongojs.ObjectId(user._id)
            },
            {
                $inc: {
                    loginCount: 1
                },
                $set: {
                    lastLoginAt: new Date()
                }
            },
            function () {
                logger.debug(uid + ' 登录成功!');
                res.jsonp({
                    code: 200,
                    token: Token.create(user._id, Date.now(), password.toString(), secret),
                    uid: user._id
                });
            });
    });

});


app.post('/login', function (req, res) {

    var data = req.body;

    var username = data.username;
    var pwd = data.password;

    if (!username || !pwd) {
        res.send({
            code: 1003
        });
        return;
    }

    db.user.findOne({
        $or: [{
            username: username
        }, { mobile: username }]
    }, function (err, user) {
        if (err || !user) {
            logger.warn('用户名不存在! username: ' + username);
            res.jsonp({
                code: 1001
            });
            return;
        }

        //密码加密
        
        if (!passwordHash.verify(pwd.toString(), user.password.toString())) {
            // TODO code
            // password is wrong
            logger.warn('用户密码错误! username: ' + username);
            res.jsonp({
                code: 1002
            });
            return;
        }

        db.user.update(
            {
                _id: mongojs.ObjectId(user._id)
            },
            {
                $inc: {
                    loginCount: 1
                },
                $set: {
                    lastLoginAt: new Date()
                }
            },
            function () {
                logger.debug(username + ' 登录成功!');
                res.jsonp({
                    code: 200,
                    token: Token.create(user._id, Date.now(), pwd, secret),
                    uid: user._id
                });
            });
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
        //var password = passwordHash.generate(msg.password);
        var password = msg.password;
        var user = {
            username: msg.username,
            password: password,
            mobile: msg.mobile == undefined ? '' : msg.mobile,
            loginCount: 0,
            createdAt: new Date()
        };
        db.user.save(user, function (err, doc) {
            logger.debug('A new user was created! --' + msg.username);
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
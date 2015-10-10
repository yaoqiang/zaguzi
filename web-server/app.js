var express = require('express');
var Token = require('../shared/token');
var secret = require('../shared/config/session').secret;
var userDao = require('./lib/dao/userDao');
var app = express();
var mysql = require('./lib/dao/mysql/mysql');
var everyauth = require('./lib/oauth');

var log4js = require('log4js');
var logger = log4js.getLogger();

var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');

app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Populates req.session
app.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: 'keyboard cat'
}));

//设置跨域访问
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 4.13.3')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});


app.get('/auth_success', function(req, res) {
    if (req.session.userId) {
        var token = Token.create(req.session.userId, Date.now(), secret);
        res.render('auth', {code: 200, token: token, uid: req.session.userId});
    } else {
        res.render('auth', {code: 500});
    }
});


app.post('/login', function(req, res) {
    var msg = req.body;

    var username = msg.username;
    var pwd = msg.password;

    if (!username || !pwd) {
        res.send({code: 1003});
        return;
    }

    userDao.getUserByName(username, function(err, user) {
        if (err || !user) {
            logger.warn('username not exist! username: ' + username);
            res.jsonp({code: 1001});
            return;
        }
        if (pwd !== user.password) {
            // TODO code
            // password is wrong
            logger.warn('password incorrect! username: ' + username);
            res.jsonp({code: 1002});
            return;
        }

        logger.info(username + ' login success!');

        res.jsonp({code: 200, token: Token.create(user.id, Date.now(), secret), uid: user.id});
    });
});

app.get('/signup', function(req, res) {
    res.render('signup', {  title: 'Signup'});
});

app.post('/register', function(req, res) {
    var msg = req.body;
    if (!msg.username || !msg.password) {
        res.send({code: 500});
        return;
    }

    userDao.createUser(msg.username, msg.password, '', function(err, user) {
        if (err || !user) {
            logger.error(err);
            if (err && err.code === 1062) {
                res.send({code: 501});
            } else {
                res.send({code: 500});
            }
        } else {
            logger.info('A new user was created! --' + msg.username);
            res.send({code: 200, token: Token.create(user.id, Date.now(), secret), uid: user.id});
        }
    });
});

//Init mysql
mysql.init();

app.listen(3001);

// Uncaught exception handler
process.on('uncaughtException', function(err) {
    logger.error(' Caught exception: ' + err.stack);
});

logger.info("Web server has started.");



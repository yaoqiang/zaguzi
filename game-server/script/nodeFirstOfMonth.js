//nodejs执行, 每月第一天执行

var mongojs = require('mongojs');

var Promise = require('promise');

var db = require('../app/dao/mongodb');

var moment = require('moment');
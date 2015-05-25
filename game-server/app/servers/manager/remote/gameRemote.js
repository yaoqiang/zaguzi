var gameService = require('../../../services/gameService');
var Code = require('../../../../../shared/code');
var utils = require('../../../util/utils');
var _ = require('underscore');

module.exports = function(app) {
    return new GameRemote(app);
};

var GameRemote = function(app) {
    this.app = app;
};

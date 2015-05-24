
module.exports = function(app) {
    return new PlayerRemote(app);
};

var PlayerRemote = function(app) {
    this.app = app;
};


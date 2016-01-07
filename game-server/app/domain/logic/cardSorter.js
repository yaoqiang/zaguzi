var _ = require('lodash');

var CardSorter = function(){}

CardSorter.sort = function(cards)
{
    return _.sortBy(cards, function(v) {
        return v % 100;
    }).reverse();
}

module.exports = CardSorter;
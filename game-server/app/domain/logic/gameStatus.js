var _ = require('underscore');



var GameStatus = function(){
    this.currentHoldingCards = [];
    this.outCards = [];
    this.isTrusteeship = false;
    this.isLastFanTimeout = false;
    this.fanTimeoutTimes = 0;
    this.identity = 0;  //身份（0：未知、1：股子、2：红3）
    this.append = [];
}

/**
 * 重置牌局基本信息
 */
GameStatus.prototype.reset = function()
{
    this.currentHoldingCards = [];
    this.outCards = [];
    this.isTrusteeship = false;
    this.isLastFanTimeout = false;
    this.fanTimeoutTimes = 0;
    this.identity = 0;  //身份（0：未知、1：3、2：股子）
    this.append = [];
}

/**
 * 出牌
 * @param cards
 */
GameStatus.prototype.fanCards = function(cards)
{
    if (!! cards || cards.length < 1) return;

    this.removeHoldingCards(cards);
    this.addOutCards(cards);

}

/**
 * 获取手牌
 * @returns {Array}
 */
GameStatus.prototype.getHoldingCards = function()
{
    return this.currentHoldingCards;
}


/**
 * 设置手牌
 * @param cards
 */
GameStatus.prototype.setHoldingCards = function(cards)
{
    this.currentHoldingCards = [];
    this.addHoldingCards(cards);

}

/**
 * 添加手牌
 * @param cards
 */
GameStatus.prototype.addHoldingCards = function(cards)
{
    for(var v in cards)
    {
        if (cards[v] > 0)
        {
            this.currentHoldingCards.push(cards[v]);
        }
    }
}

/**
 * 删除手牌
 * @param cards
 */
GameStatus.prototype.removeHoldingCards = function(cards)
{
    for (var v in cards)
    {
        this.currentHoldingCards = _.without(this.currentHoldingCards, cards[v]);
    }
}

/**
 * 添加出牌
 * @param cards
 */
GameStatus.prototype.addOutCards = function(cards)
{
    for (var v in cards)
    {
        if (cards[v] > 0)
        {
            this.outCards.push(cards[v]);
        }
    }
}

/**
 * 是否持有牌
 * @param cards
 * @returns {boolean}
 */
GameStatus.prototype.hasCards = function(cards)
{
    if (!! cards || cards.length < 1)
        return true;

    for (var v in cards)
    {
        if (!_.contains(this.currentHoldingCards, cards[v])) return false;
    }
    return true;
}


module.exports = GameStatus;
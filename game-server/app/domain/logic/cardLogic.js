var _ = require('underscore');
var CardRecognization = require('./cardRecognization');
var consts = require('../../consts/consts');


var CardLogic = {}

CardLogic.CardSeriesCode = {
    cardSeries_1: 0, //单牌
    cardSeries_2: 1, //对子
    cardSeries_3: 2, //炸弹
    cardSeries_4: 3, //四轮车
    cardSeries_5: 4, //对王
    cardSeries_6: 5, //双三满天飞
    cardSeries_99: 6 //无法识别，错误牌型
}

/**
 * 牌型识别
 * @param cards 当前出牌
 * @param type  当前牌桌类型（1：5人、2：6人、3：7人）
 * @param liang3 当前牌局亮3情况，决定片3是否能打4；决定双三是否可满天飞
 * @returns {CardRecognization}
 */
CardLogic.recognizeSeries = function(cards, type, liang3)
{
    if (!! cards || cards.length < 1 || cards.length > 4)
        return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_99, 0);

    //校验牌型
    if (cards.length > 1 && cards.length < 5)
    {
        var tmp = _.map(cards, function(v)
        {
            return v % 100;
        });

        //如果是两张牌
        if (tmp.length == 2)
        {
            //如果两张牌相同
            if (tmp[0] == tmp[1])
            {
                //如果是5人场并且是双三
                var result = _.sortBy(cards, function(v){
                    return v;
                });
                //如果当前是5人局，出牌是双三，并且方块3亮了，即是双三满天飞
                if ((result[0] == 116 && result[1] == 216) && _.contains(liang3, 116))
                {
                    if (type == consts.GAME.TYPE.FIVE)
                    {
                        return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_6, null);
                    }
                }
                return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_1, tmp[0], cards);
            }
            else
            {
                //如果是双王
                if (_.contains(tmp, 18) && _.contains(tmp, 19))
                {
                    return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_5, null);
                }
                //错误牌型
                else
                {
                    return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_99, 0);
                }
            }
        }
        //如果是三张牌
        else if (tmp.length == 3)
        {
            //如果三张牌相同
            if (tmp[0] == tmp[1] && tmp[1] == tmp[2])
            {
                return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_2, tmp[0], cards);
            }
            else
            {
                return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_99, 0);
            }
        }
        else
        {
            //如果四张牌相同
            if (tmp[0] == tmp[1] && tmp[1] == tmp[2] && tmp[2] == tmp[3])
            {
                return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_3, tmp[0], cards);
            }
            else
            {
                return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_99, 0);
            }
        }

    }
    else
    {
        return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_1, cards[0]%100, cards);
    }

}

/**
 * 牌型比较
 * @param cr1   当前牌型
 * @param cr2   上手牌型
 * @param type  当前牌桌类型（1：5人、2：6人、3：7人）
 * @param liang3 当前牌局亮3情况，决定片3是否能打4；决定双三是否可满天飞
 * @returns {boolean}
 */
CardLogic.isCurrentBiggerThanLast = function(cr1, cr2, type, liang3)
{
    if ( !! cr1) {
        return false;
    }
    if ( !! cr2) {
        return false;
    }

    if (cr1.cardSeries == CardLogic.CardSeriesCode.cardSeries_99)
    {
        return false;
    }

    if (cr1.cardSeries == cr2.cardSeries)
    {
        //如果是单牌
        if (cr1.cardSeries == CardLogic.CardSeriesCode.cardSeries_1)
        {
            //如果当前牌型是方块3或红桃3
            if (_.contains([116, 216], cr1.cardSeries.originalCard[0])) {
                //如果是5人和7人场，计算3的特殊大小；6人平3
                if (type == consts.GAME.TYPE.FIVE || type == consts.GAME.TYPE.SEVEN)
                {
                    //如果当前出牌是肉3（红桃3）并且上手出牌不是大小王
                    if (cr1.cardSeries.originalCard[0] == 216 && cr2.cardSeries.maxCardPoint < 18)
                    {
                        return true;
                    }

                    if (type == consts.GAME.TYPE.FIVE)
                    {
                        //如果当前出牌是方块3
                        if (cr1.cardSeries.originalCard[0] == 116)
                        {
                            //如果方块3亮了
                            if (_.contains(liang3, cr1.cardSeries.originalCard[0]))
                            {
                                //如果上手牌不是肉3和大小王
                                if (cr2.cardSeries.originalCard[0] != 216 && cr2.cardSeries.originalCard[0] != 18 && cr2.cardSeries.originalCard[0] != 19)
                                {
                                    return true;
                                }
                            }
                            return false;
                        }
                    }
                }

            }

        }
        if (cr1.maxCardPoint > cr2.maxCardPoint)
        {
            return true;
        }
        else
        {
            return false;
        }
    }
    //如果当前牌型为双王
    if (cr1.cardSeries == CardLogic.CardSeriesCode.cardSeries_5)
    {
        //如果上手牌型不是双三，则最大
        if (cr2.cardSeries == CardLogic.CardSeriesCode.cardSeries_6)
        {
            return false;
        }
        else
        {
            return true;
        }
    }

    //如果当前牌型为双三
    if (cr1.cardSeries == CardLogic.CardSeriesCode.cardSeries_6)
    {
        //如果上手牌型不是双王，则最大
        if (cr2.cardSeries != CardLogic.CardSeriesCode.cardSeries_5)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    //如果是炸弹(3张相同牌）
    if (cr1.cardSeries == CardLogic.CardSeriesCode.cardSeries_2)
    {
        if (cr2.cardSeries != CardLogic.CardSeriesCode.cardSeries_3 && cr2.cardSeries != CardLogic.CardSeriesCode.cardSeries_4 && cr2.cardSeries != CardLogic.CardSeriesCode.cardSeries_5)
        {
            if (cr1.maxCardPoint > cr2.maxCardPoint)
            {
                return true;
            }
        }
        return false;
    }

    //如果是四轮车
    if (cr1.cardSeries == CardLogic.CardSeriesCode.cardSeries_3)
    {
        if (cr2.cardSeries != CardLogic.CardSeriesCode.cardSeries_4 && cr2.cardSeries != CardLogic.CardSeriesCode.cardSeries_5)
        {
            if (cr1.maxCardPoint > cr2.maxCardPoint)
            {
                return true;
            }
        }
        return false;
    }

}

module.exports = CardLogic;
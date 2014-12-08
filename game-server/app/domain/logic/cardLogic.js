var _ = require('underscore');
var CardRecognization = require('./cardRecoginzation')


var CardSeriesCode = {
    cardSeries_1: 0, //单牌
    cardSeries_2: 1, //对子
    cardSeries_3: 2, //炸弹
    cardSeries_4: 3, //四轮车
    cardSeries_5: 4, //对王
    cardSeries_6: 5, //双三满天飞
    cardSeries_99: 6 //无法识别，错误牌型
}

var CardLogic = {}

/**
 * 牌型识别
 * @param cards 当前出牌
 * @param type  当前牌桌类型（1：5人、2：7人）
 * @returns {CardRecognization}
 */
CardLogic.recognizeSeries = function(cards, type)
{
    if (!! cards || cards.length < 1 || cards.length > 4)
        return new CardRecognization(CardSeriesCode.cardSeries_99, 0);

    //校验牌型
    if (cards.length > 1)
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
                if ((result[0] == 116 && result[1] == 216))
                {
                    if (type == 5)
                    {
                        return new CardRecognization(CardSeriesCode.cardSeries_6, null);
                    }
                }
                return new CardRecognization(CardSeriesCode.cardSeries_1, tmp[0], cards);
            }
            else
            {
                //如果是双王
                if (_.contains(tmp, 18) && _.contains(tmp, 19))
                {
                    return new CardRecognization(CardSeriesCode.cardSeries_5, null);
                }
                //错误牌型
                else
                {
                    return new CardRecognization(CardSeriesCode.cardSeries_99, 0);
                }
            }
        }
        //如果是三张牌
        else if (tmp.length == 3)
        {
            //如果三张牌相同
            if (tmp[0] == tmp[1] && tmp[1] == tmp[2])
            {
                return new CardRecognization(CardSeriesCode.cardSeries_2, tmp[0], cards);
            }
            else
            {
                return new CardRecognization(CardSeriesCode.cardSeries_99, 0);
            }
        }
        else
        {
            //如果四张牌相同
            if (tmp[0] == tmp[1] && tmp[1] == tmp[2] && tmp[2] == tmp[3])
            {
                return new CardRecognization(CardSeriesCode.cardSeries_3, tmp[0], cards);
            }
            else
            {
                return new CardRecognization(CardSeriesCode.cardSeries_99, 0);
            }
        }

    }
    else
    {
        return new CardRecognization(CardSeriesCode.cardSeries_1, cards[0]%100, cards);
    }

}

/**
 * 牌型比较
 * @param cr1   当前牌型
 * @param cr2   上手牌型
 * @param type  牌桌类型（1：5人、2：7人）
 * @returns {boolean}
 */
CardLogic.isCurrentBiggerThanLast = function(cr1, cr2, type)
{
    if ( !! cr1) {
        return false;
    }
    if ( !! cr2) {
        return false;
    }

    if (cr1.cardSeries == CardSeriesCode.cardSeries_99)
    {
        return false;
    }

    if (cr1.cardSeries == cr2.cardSeries)
    {
        //如果是单牌
        if (cr1.cardSeries == CardSeriesCode.cardSeries_1)
        {
            //如果当前出牌是肉3（红桃3）并且上手出牌不是大小王
            if (cr1.cardSeries.originalCard[0] == 216 && cr2.cardSeries.maxCardPoint < 18)
            {
                return true;
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
    if (cr1.cardSeries == CardSeriesCode.cardSeries_5)
    {
        //如果上手牌型不是双三，则最大
        if (cr2.cardSeries != CardSeriesCode.cardSeries_6)
        {
            return true;
        }
        else
        {
            //如果上手牌型是双三，并且牌桌不是5人局，则最大
            if (type != 1)
            {
                return true;
            }
            return false;
        }
    }

    //如果当前牌型为双三
    if (cr1.cardSeries == CardSeriesCode.cardSeries_6)
    {
        //如果上手牌型不是双王，则最大
        if (cr2.cardSeries != CardSeriesCode.cardSeries_5 && type == 5)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    //如果是炸弹
    if (cr1.cardSeries == CardSeriesCode.cardSeries_2)
    {
        if (cr2.cardSeries != CardSeriesCode.cardSeries_3 || cr2.cardSeries != CardSeriesCode.cardSeries_4 || cr2.cardSeries != CardSeriesCode.cardSeries_5)
        {
            return true;
        }
        return false;
    }

    //如果是四轮车
    if (cr1.cardSeries == CardSeriesCode.cardSeries_3)
    {
        if (cr2.cardSeries != CardSeriesCode.cardSeries_4 || cr2.cardSeries != CardSeriesCode.cardSeries_5)
        {
            return true;
        }
        return false;
    }

}

module.exports = CardLogic;
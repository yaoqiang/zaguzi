var _ = require('lodash');
var CardRecognization = require('./cardRecognization');
var consts = require('../../consts/consts');


var CardLogic = {}

CardLogic.CardSeriesCode = {
    cardSeries_1: 1, //单牌
    cardSeries_2: 2, //对子
    cardSeries_3: 3, //炸弹
    cardSeries_4: 4, //四轮车
    cardSeries_5: 5, //对王
    cardSeries_6: 6, //双三满天飞
    cardSeries_99: 7 //无法识别，错误牌型
}

/**
 * 牌型识别
 * @param cards 当前出牌
 * @param type  当前牌桌类型（5：5人、6：6人、7：7人）
 * @param liang3 当前牌局亮3情况，决定片3是否能打4；决定双三是否可满天飞
 * @returns {CardRecognization}
 */
CardLogic.recognizeSeries = function(cards, type, liang3)
{
    if (!cards || cards == undefined || cards.length < 1 || cards.length > 4)
    {
        return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_99, 0, []);
    }

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
                        return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_6, tmp[0], cards);
                    }
                }
                return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_2, tmp[0], cards);
            }
            else
            {
                //如果是双王
                if (_.contains(tmp, 18) && _.contains(tmp, 19))
                {
                    return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_5, tmp[0], cards);
                }
                //错误牌型
                else
                {
                    return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_99, 0, []);
                }
            }
        }
        //如果是三张牌
        else if (tmp.length == 3)
        {
            //如果三张牌相同
            if (tmp[0] == tmp[1] && tmp[1] == tmp[2])
            {
                return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_3, tmp[0], cards);
            }
            else
            {
                return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_99, 0, []);
            }
        }
        else
        {
            //如果四张牌相同
            if (tmp[0] == tmp[1] && tmp[1] == tmp[2] && tmp[2] == tmp[3])
            {
                return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_4, tmp[0], cards);
            }
            else
            {
                return new CardRecognization(CardLogic.CardSeriesCode.cardSeries_99, 0, []);
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
 * @param type  当前牌桌类型（5：5人、6：6人、7：7人）
 * @param liang3 当前牌局亮3情况，决定片3是否能打4；决定双三是否可满天飞
 * @returns {boolean}
 */
CardLogic.isCurrentBiggerThanLast = function(cr1, cr2, type, liang3)
{
    if (_.isUndefined(cr1) || !_.isObject(cr1)) {
        return false;
    }
    if (_.isUndefined(cr2)|| !_.isObject(cr2)) {
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
            if (_.contains([116, 216], cr1.originalCard[0])) {
                //如果是5人和7人场，计算3的特殊大小；6人平3
                if (type == consts.GAME.TYPE.FIVE || type == consts.GAME.TYPE.SEVEN)
                {
                    //如果当前出牌是肉3（红桃3）并且上手出牌不是大小王
                    if (cr1.originalCard[0] == 216 && cr2.maxCardPoint < 18)
                    {
                        return true;
                    }

                    if (type == consts.GAME.TYPE.FIVE)
                    {
                        //如果当前出牌是方块3
                        if (cr1.originalCard[0] == 116)
                        {
                            //如果方块3亮了
                            if (_.contains(liang3, cr1.originalCard[0]))
                            {
                                //如果上手牌不是肉3和大小王
                                if (cr2.originalCard[0] != 216 && cr2.originalCard[0] != 18 && cr2.originalCard[0] != 19)
                                {
                                    return true;
                                }
                            }
                            else {
                                if (cr1.maxCardPoint > cr2.maxCardPoint)
                                {
                                    return true;
                                }
                                else
                                {
                                    return false;
                                }
                            }
                        }
                    }
                }
                else {
                    if (cr1.maxCardPoint > cr2.maxCardPoint)
                    {
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                }
            }

            //判断4是否能打3
            if (_.contains([117, 217, 317, 417], cr1.originalCard[0])) {
                //6人平3可打；5人如果块3不亮也可打；
                if (type == consts.GAME.TYPE.FIVE || type == consts.GAME.TYPE.SEVEN)
                {
                    //如果上手牌是红3，那4大不了
                    if (cr2.originalCard[0] == 216) {
                        return false;
                    }
                    //如果上手牌是方块3
                    if (cr2.originalCard[0] == 116) {
                        //如果当前是5人局，如果方块3亮了，则4大不了3
                        if (type == consts.GAME.TYPE.FIVE) {
                            if (_.contains(liang3, 116)) return false;
                            return true;
                        }
                        //如果当前是7人局，方块3大不了4
                        return true;
                    }
                    //正常比较即可
                    if (cr1.maxCardPoint > cr2.maxCardPoint)
                    {
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                }
                else {
                    if (cr1.maxCardPoint > cr2.maxCardPoint)
                    {
                        return true;
                    }
                    else
                    {
                        return false;
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

    //如果是炸弹(3张相同牌）、如果是四轮车：炸弹和四轮车比较逻辑一样
    if (cr1.cardSeries == CardLogic.CardSeriesCode.cardSeries_3 || cr1.cardSeries == CardLogic.CardSeriesCode.cardSeries_4)
    {
        //如果上手牌型是比当前牌型大，返回false
        if (cr2.cardSeries > cr1.cardSeries)
        {
            return false;
        }
        else if (cr1.cardSeries == cr2.cardSeries) {
            if (cr1.maxCardPoint > cr2.maxCardPoint)
            {
                return true;
            }
            return false;
        }
        else {
            return true;
        }
    }
    
    //上手牌是单牌, 当前牌型是对子; 或者 上手牌是对子, 当前牌型是单牌; 无法匹配则返回undefined;
    return undefined;

}

CardLogic.simpleAnalysis = function (lastFanCardRecognization, holdingCards, type, liang3) {
    if (lastFanCardRecognization.cardSeries == CardLogic.CardSeriesCode.cardSeries_99) {
        return [];
    }
    // 分析手牌牌型
    var holdingCardsRecognization = analysisHoldingCards(holdingCards);
    // 从小到大排序手牌牌型
    var sortedCardRecognizationList = _.flatten(_.map(holdingCardsRecognization, function(crList) {
      return crList.reverse();
    }));

    // 手牌与上手牌型比较, 得出大于的牌型, 并获取第一个
    var biggerCardRecognizationList = _.filter(sortedCardRecognizationList, function (cr) {
        return CardLogic.isCurrentBiggerThanLast(cr, lastFanCardRecognization, type, liang3);
    });

    var simpleAnalysisResult = _.first(biggerCardRecognizationList);


    return _.isUndefined(simpleAnalysisResult) ? [] : simpleAnalysisResult.originalCard;


    //分析手牌, 得出各牌型结果{cardSeries_1: [CardRecognization,], cardSeries_2: [...], ...}
    function analysisHoldingCards (holdingCards) {
        // holdingCards = holdingCards.reverse();
        var initState = {
          cardSeries_1: [],
          cardSeries_2: [],
          cardSeries_3: [],
          cardSeries_4: [],
          cardSeries_5: [],
          cardSeries_6: []
        };

        var result = _.reduce(holdingCards, function (current, card, key) {
            //识别单牌
            var cardRecognization = CardLogic.recognizeSeries([card], type, liang3);
            //放入单牌数组
            initState.cardSeries_1.push(cardRecognization);
            //如果是1张以上牌, 分析对子、炸弹、4个、双3、双王
            if (key > 0) {
              var originalCard1 = initState.cardSeries_1[key].originalCard;
              var originalCard2 = initState.cardSeries_1[key-1].originalCard;

              //如果两张一样, 则分析是双3、双王还是对子
              var originalCards = [originalCard1, originalCard2];
              var recognizationOfSameTwoCards = CardLogic.recognizeSeries(_.flatten(originalCards), type, liang3);
              switch (recognizationOfSameTwoCards.cardSeries) {
                case CardLogic.CardSeriesCode.cardSeries_2:
                  initState.cardSeries_2.push(recognizationOfSameTwoCards);
                  break;
                case CardLogic.CardSeriesCode.cardSeries_5:
                  initState.cardSeries_5.push(recognizationOfSameTwoCards);
                  break;
                case CardLogic.CardSeriesCode.cardSeries_6:
                  initState.cardSeries_6.push(recognizationOfSameTwoCards);
                  break;
                default:
                  break;
              }

              if (key > 1) {
                var originalCard3 = initState.cardSeries_1[key-2].originalCard;
                //如果3张一样, 则是炸弹
                if (originalCard1[0]%100 == originalCard2[0]%100 && originalCard2[0]%100 == originalCard3[0]%100) {
                    var originalCards = [originalCard1, originalCard2, originalCard3];
                    initState.cardSeries_3.push(CardLogic.recognizeSeries(_.flatten(originalCards), type, liang3))
                }
                if (key > 2) {
                  var originalCard4 = initState.cardSeries_1[key-3].originalCard;
                  //如果4张一样，则是4个
                  if (originalCard1[0]%100 == originalCard2[0]%100 && originalCard2[0]%100 == originalCard3[0]%100 && originalCard3[0]%100 == originalCard4[0]%100) {
                      var originalCards = [originalCard1, originalCard2, originalCard3, originalCard4];
                      initState.cardSeries_4.push(CardLogic.recognizeSeries(_.flatten(originalCards), type, liang3))
                  }
                }
              }
            }
            return initState;
        }, initState);

        return result;
    }

}


module.exports = CardLogic;
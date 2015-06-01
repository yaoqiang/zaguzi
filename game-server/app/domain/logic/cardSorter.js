var CardSorter = function(){}

CardSorter.sort = function(cards)
{
    for (var i = 1; i < cards.length; i++)
    {
        var t = cards[i];
        var j = i;
        while ((j > 0) && ((cards[j - 1] % 100) > (t % 100)))
        {
            cards[j] = cards[j - 1];
            --j;
        }
        cards[j] = t;
    }
    return cards;
}

module.exports = CardSorter;
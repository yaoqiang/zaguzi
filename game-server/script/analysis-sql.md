## 订单统计
```
db.order.aggregate(
	[
	{
		$match: {state: 'FINISHED', _id: {$gt: ObjectId("583ef7800000000000000000")}}
	},
     {
	     $group: {
	     _id: -1,
	       totalAmount: { $sum: "$amount" },
           count: { $sum: 1 }
	     }
	   }
   ]
)
```

[BSON ObjectId在线工具][https://steveridout.github.io/mongo-object-time/]

## 兑换统计
```
db.exchangeRecord.aggregate([
    {
        $lookup: {
          from: "exchangeList",
          localField: "exchangeId",
          foreignField: "_id",
          as: "exchange_docs"
        }
    },
    { $unwind : "$exchange_docs" },

    {
        $lookup: {
          from: "player",
          localField: "uid",
          foreignField: "uid",
          as: "player_docs"
        }
    },
    { $unwind : "$player_docs" },

    {
        $lookup: {
          from: "user",
          localField: "uid",
          foreignField: "_id",
          as: "user_docs"
        }
    },
    { $unwind : "$user_docs" },

    {
        $match: {'exchange_docs.type': 'INBOX_CALL', _id: {$gt: ObjectId("5724d6800000000000000000")}}
    },

     {
         $group : {
             
             _id : {uid: "$uid", nickName: '$player_docs.nickName', mobile: '$user_docs.mobile'}, 
             total: { $sum: "$exchange_docs.denomination"},
             times: {$sum: 1}
         }
     },

     { $sort : { total : -1 } }
])
```
统计兑换总金额：group._id替换为：_id : 1, 
    

 

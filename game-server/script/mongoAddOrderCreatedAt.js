var db = connect('zgz');
var orderList  = db.order.find();
orderList.forEach(function(order) {
    db.order.update({_id: order._id}, {$set: {createdAt: order._id.getTimestamp()}})
});

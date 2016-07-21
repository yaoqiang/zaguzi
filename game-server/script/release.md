第一步：
停服.. pomelo stop

第二步：
备份mongodb，执行 ./mongobak.sh

第三步：
备份元宝任务数据，执行 mongo < mongoIngotTaskBackup.js

第四步：
初始化新任务数据，执行 node nodeInitTask.js

第五步：
恢复元宝数据，执行 mongo < mongoIngotTaskRestore

第六步：
配置crontab，写入版本初始数据：initTestData.js里版本数据，消息数据和活动数据

第七步：
启动

最后：
测试
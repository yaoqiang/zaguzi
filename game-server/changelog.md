# 更新记录

## v1.1 [2016.4.13]
第一个版本 

## v1.2 [2016.5.1]
更换了pomelo，官方pomelo-rpc会导致服务down掉(发生一次)，由pomelo-rt替换官方pomelo，
优化和修复了诸多bug, 稳定版

## v1.3 [2016.7]
改造大厅&房间逻辑（参见 大厅房间说明.md）
增加邀请奖励
喇叭功能优化(喇叭输入框优化，显示最近3条喇叭)
UI交互改善(1 签到自动弹出；2 破产补助可在牌局中领取；3 新邮件气泡提示)
五人局双三认输
牌局结束后显示玩家剩余手牌
修改头像（系统默认头像）
牌局动效
商城列表调整，增加分类：金币/道具
苹果支付优化, 解决之前扣款成功未成功添加金币道具的bug(Websocket改为HTTP)
任务调整(因大厅&房间逻辑改造导致)
增加私人场
股神排行榜改为月排行榜，并且每月有奖励
掉线后牌型识别错误bug fixed（五人局中块3打不了4，双三飞不了bug）
6/7人牌桌表情停留bug fixed
牌局是开会结果时,如果没有亮3,就等于没开会的bug fixed。（之前计算开会的赢家身份错误, 之前按照玩家说话身份计算了, 现在改为按玩家真实身份）


## v1.3.2 [2016.7] (客户端-iOS)
主要针对apple store,客户端适配IPv6.


## v1.4 [2016.8]
客户端修复股神月排行榜每月1号没清零bug
客户端在个人信息里显示级别信息
可以通过喇叭内容查看发喇叭用户信息
增加抽奖功能
元宝场增加5000底注5人局
##
苹果客户端根据审核开关加入充值渠道选择，添加支付宝支付 -iOS
客户端在金币不足时，弹出快捷充值框（默认6元套餐）

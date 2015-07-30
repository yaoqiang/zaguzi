/*
Navicat MySQL Data Transfer

Source Server         : localhost
Source Server Version : 50619
Source Host           : localhost:3306
Source Database       : zgz

Target Server Type    : MYSQL
Target Server Version : 50619
File Encoding         : 65001

Date: 2014-12-09 15:01:55
*/

--CREATE DATABASE IF NOT EXISTS zgz DEFAULT CHARSET utf8 COLLATE utf8_general_ci;
--
--USE zgz;


SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for player
-- ----------------------------
DROP TABLE IF EXISTS `player`;
CREATE TABLE `player` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `nickName` varchar(30) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `avatar` varchar(30) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `gold` bigint(20) DEFAULT NULL,
  `winNr` int DEFAULT 0,
  `loseNr` int DEFAULT 0,
  `tieNr` int DEFAULT 0,
  `rank` int DEFAULT 0,
  `exp` int DEFAULT 0,
  `fragment` int DEFAULT 0,
  `userId` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `INDEX_USER_ID` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of player
-- ----------------------------
INSERT INTO `player` VALUES ('1', '你说啥我说啥', '8', '5000', 0, 0, 0, '1', '0', '0', '1');
INSERT INTO `player` VALUES ('2', '2huo', '8', '5000', 0, 0, 0, '1', '0', '0', '3');
INSERT INTO `player` VALUES ('3', '活活活', '8', '5000', 0, 0, 0, '1', '0', '0', '4');
INSERT INTO `player` VALUES ('4', 'iya', '8', '5000', 0, 0, 0, '1', '0', '0', '5');
INSERT INTO `player` VALUES ('5', 'bug', '8', '5000', 0, 0, 0, '1', '0', '0', '6');
INSERT INTO `player` VALUES ('6', 'todo', '8', '5000', 0, 0, 0, '1', '0', '0', '7');
INSERT INTO `player` VALUES ('7', 'nihao', '8', '5000', 0, 0, 0, '1', '0', '0', '8');
INSERT INTO `player` VALUES ('8', '2b', '8', '5000', 0, 0, 0, '1', '0', '0', '9');
INSERT INTO `player` VALUES ('9', 'shit', '8', '5000', 0, 0, 0, '1', '0', '0', '10');
INSERT INTO `player` VALUES ('10', '西门吹雪', '1', '5000', 0, 0, 0, '1', '0', '0', '2');
INSERT INTO `player` VALUES ('11', '要强', '1', '5000', 0, 0, 0, '1', '0', '0', '11');
INSERT INTO `player` VALUES ('12', '李建新', '3', '5000', 0, 0, 0, '1', '0', '0', '12');
INSERT INTO `player` VALUES ('13', '臧宏文', '4', '5000', 0, 0, 0, '1', '0', '0', '13');
INSERT INTO `player` VALUES ('14', '薛文', '5', '5000', 0, 0, 0, '1', '0', '0', '14');
INSERT INTO `player` VALUES ('15', '张建阳', '6', '5000', 0, 0, 0, '1', '0', '0', '15');
INSERT INTO `player` VALUES ('16', '吕建成', '7', '5000', 0, 0, 0, '1', '0', '0', '16');
INSERT INTO `player` VALUES ('17', '樊一伟', '8', '5000', 0, 0, 0, '1', '0', '0', '17');

-- ----------------------------
-- Table structure for properties
-- ----------------------------
DROP TABLE IF EXISTS `properties`;
CREATE TABLE `properties` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `userId` bigint(20) DEFAULT NULL,
  `lastLogin` smallint DEFAULT 0,
  `getBankruptNr` smallint DEFAULT 0,
  `continuousLoginNr` smallint DEFAULT 0,
  `isGetContinuousLogin` smallint DEFAULT 0,
  `isFirstPay` smallint DEFAULT 0,
  `taskJson` varchar(200) DEFAULT NULL,
  `itemJson` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `INDEX_USER_ID` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of properties
-- ----------------------------
INSERT INTO `properties` VALUES ('1', '1', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('2', '2', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('3', '3', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('4', '4', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('5', '5', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('6', '6', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('7', '7', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('8', '8', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('9', '9', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('10', '10', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('11', '11', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('12', '12', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('13', '13', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('14', '14', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('15', '15', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('16', '16', '0', '0', 0, 0, 0, '{}', '{}');
INSERT INTO `properties` VALUES ('17', '17', '0', '0', 0, 0, 0, '{}', '{}');

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `password` varchar(50) COLLATE utf8_unicode_ci DEFAULT '',
  `loginCount` smallint(6) unsigned DEFAULT '0',
  `from` varchar(25) COLLATE utf8_unicode_ci DEFAULT NULL,
  `lastLoginTime` bigint(20) DEFAULT '0',
  `createdAt` bigint(20) DEFAULT '0',
  `mobile` varchar(20),
  PRIMARY KEY (`id`),
  UNIQUE KEY `INDEX_ACCOUNT_NAME` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Records of user
-- ----------------------------
INSERT INTO `user` VALUES ('1', 'a', 'a', '0', null, '1416979185627', '0', '');
INSERT INTO `user` VALUES ('2', 'b', 'b', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('3', 'c', 'c', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('4', 'd', 'd', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('5', 'e', 'e', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('6', 'f', 'f', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('7', 'g', 'g', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('8', 'h', 'h', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('9', 'i', 'i', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('10', 'j', 'j', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('11', 'yaoqiang', '0', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('12', 'lijianxin', '0', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('13', 'zanghongwen', '0', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('14', 'xuewen', '0', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('15', 'zhangjianyang', '0', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('16', 'lvjiancheng', '0', '0', '', '1416979185627', '0', '');
INSERT INTO `user` VALUES ('17', 'fanyiwei', '0', '0', '', '1416979185627', '0', '');


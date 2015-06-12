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
  `winNr` int DEFAULT NULL,
  `loseNr` int DEFAULT NULL,
  `rank` varchar(20) DEFAULT NULL,
  `fragment` varchar(20) DEFAULT NULL,
  `userId` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of player
-- ----------------------------
INSERT INTO `player` VALUES ('1', '你说啥我说啥', '8', '5000', 0, 0, '1', '0', '1');
INSERT INTO `player` VALUES ('2', '2huo', '8', '5000', 0, 0, '1', '0', '3');
INSERT INTO `player` VALUES ('3', '活活活', '8', '5000', 0, 0, '1', '0', '4');
INSERT INTO `player` VALUES ('4', 'iya', '8', '5000', 0, 0, '1', '0', '5');
INSERT INTO `player` VALUES ('5', 'bug', '8', '5000', 0, 0, '1', '0', '6');
INSERT INTO `player` VALUES ('6', 'todo', '8', '5000', 0, 0, '1', '0', '7');
INSERT INTO `player` VALUES ('7', 'nihao', '8', '5000', 0, 0, '1', '0', '8');
INSERT INTO `player` VALUES ('8', '2b', '8', '5000', 0, 0, '1', '0', '9');
INSERT INTO `player` VALUES ('9', 'shit', '8', '5000', 0, 0, '1', '0', '10');
INSERT INTO `player` VALUES ('10', '西门吹雪', '4', '5000', 0, 0, '1', '0', '2');

-- ----------------------------
-- Table structure for properties
-- ----------------------------
DROP TABLE IF EXISTS `properties`;
CREATE TABLE `properties` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `userId` bigint(20) DEFAULT NULL,
  `lastLogin` bigint(20) DEFAULT NULL,
  `getBankruptNr` int(11) DEFAULT NULL,
  `continuousLoginNr` int(11) DEFAULT NULL,
  `isGetContinuousLogin` bit(1) DEFAULT NULL,
  `isFirstPay` bit(1) DEFAULT NULL,
  `taskJson` varchar(200) DEFAULT NULL,
  `itemkJson` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of properties
-- ----------------------------

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


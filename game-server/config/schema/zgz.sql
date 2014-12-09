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
  `rank` varchar(20) DEFAULT NULL,
  `fragment` varchar(20) DEFAULT NULL,
  `userId` bigint(20) DEFAULT NULL,
  `lastLogin` bigint(20) DEFAULT NULL,
  `getBankruptNr` int(11) DEFAULT NULL,
  `continuousLoginNr` int(11) DEFAULT NULL,
  `isGetContinuousLogin` bit(1) DEFAULT NULL,
  `isFirstPay` bit(1) DEFAULT NULL,
  `taskJson` varchar(200) DEFAULT NULL,
  `itemJson` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of player
-- ----------------------------
INSERT INTO `player` VALUES ('24', '你说啥我说啥', '8', '5000', '1', '0', '1', '1417411425379', '0', '1', null, null, null, null);
INSERT INTO `player` VALUES ('25', '西门吹雪', '4', '5000', '1', '0', '2', '1417678886833', '0', '1', null, null, null, null);

-- ----------------------------
-- Table structure for properties
-- ----------------------------
DROP TABLE IF EXISTS `properties`;
CREATE TABLE `properties` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `day_last_login` int(11) DEFAULT NULL,
  `get_bankrupt_nr` int(11) DEFAULT NULL,
  `continuous_login_nr` int(11) DEFAULT NULL,
  `is_get_continuous_login` bit(1) DEFAULT NULL,
  `is_first_pay` bit(1) DEFAULT NULL,
  `task_json` varchar(200) DEFAULT NULL,
  `item_json` varchar(200) DEFAULT NULL,
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
  `login_count` smallint(6) unsigned DEFAULT '0',
  `from` varchar(25) COLLATE utf8_unicode_ci DEFAULT NULL,
  `last_login_time` bigint(20) DEFAULT '0',
  `created_at` bigint(20) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `INDEX_ACCOUNT_NAME` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Records of user
-- ----------------------------
INSERT INTO `user` VALUES ('1', 'a', 'a', '0', null, '1416979185627', '0');
INSERT INTO `user` VALUES ('2', 'c', 'c', '0', '', '1416979185627', '0');

-- ============================================
-- 修复 users 表结构：添加缺失的字段
-- ============================================
-- 说明：此脚本用于修复生产环境 users 表缺失的字段
-- 执行后，将解决 /api/users/online/today 和 /api/user-stats/me 的 500 错误
-- ============================================

USE oldksports;

-- 添加 role 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'users' 
   AND COLUMN_NAME = 'role') > 0,
  "SELECT 'Column role already exists.' AS result;",
  "ALTER TABLE users ADD COLUMN role VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '用户' COMMENT '身份：主播、甲方、服务商、用户等' AFTER roles;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 total_posts 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'users' 
   AND COLUMN_NAME = 'total_posts') > 0,
  "SELECT 'Column total_posts already exists.' AS result;",
  "ALTER TABLE users ADD COLUMN total_posts INT DEFAULT 0 AFTER reset_token_expires;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 total_replies 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'users' 
   AND COLUMN_NAME = 'total_replies') > 0,
  "SELECT 'Column total_replies already exists.' AS result;",
  "ALTER TABLE users ADD COLUMN total_replies INT DEFAULT 0 AFTER total_posts;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 consecutive_checkins 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'users' 
   AND COLUMN_NAME = 'consecutive_checkins') > 0,
  "SELECT 'Column consecutive_checkins already exists.' AS result;",
  "ALTER TABLE users ADD COLUMN consecutive_checkins INT DEFAULT 0 AFTER total_replies;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 last_checkin_date 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'users' 
   AND COLUMN_NAME = 'last_checkin_date') > 0,
  "SELECT 'Column last_checkin_date already exists.' AS result;",
  "ALTER TABLE users ADD COLUMN last_checkin_date DATE DEFAULT NULL AFTER consecutive_checkins;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 验证结果
SELECT '修复完成！' AS status;
SELECT '验证字段是否存在：' AS verification;
SHOW COLUMNS FROM users WHERE Field IN ('role', 'total_posts', 'total_replies', 'consecutive_checkins', 'last_checkin_date');


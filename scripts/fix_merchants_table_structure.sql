-- ============================================
-- 修复 merchants 表结构：添加缺失的字段
-- ============================================
-- 说明：此脚本用于修复生产环境 merchants 表缺失的字段
-- 执行后，将解决 /api/merchants 的 500 错误
-- ============================================

USE oldksports;

-- 添加 category 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'merchants' 
   AND COLUMN_NAME = 'category') > 0,
  "SELECT 'Column category already exists.' AS result;",
  "ALTER TABLE merchants ADD COLUMN category ENUM('gold', 'advertiser', 'streamer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'gold' AFTER description;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 contact_info 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'merchants' 
   AND COLUMN_NAME = 'contact_info') > 0,
  "SELECT 'Column contact_info already exists.' AS result;",
  "ALTER TABLE merchants ADD COLUMN contact_info VARCHAR(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER category;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 验证结果
SELECT '修复完成！' AS status;
SELECT '验证字段是否存在：' AS verification;
SHOW COLUMNS FROM merchants WHERE Field IN ('category', 'contact_info');


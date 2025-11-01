-- ============================================
-- 数据库迁移脚本：将 1.0 版本数据库迁移到 2.0 版本
-- ============================================
-- 说明：此脚本用于将 1.0 版本的数据库结构升级到 2.0 版本
-- 执行方式：在导入 1.0 数据库后，执行此脚本
-- ============================================

USE zeabur;

-- ============================================
-- 1. 修改 users 表字段
-- ============================================

-- 修改 username 字段长度（50 -> 100）
ALTER TABLE `users` MODIFY `username` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL;

-- 修改 email 字段长度（100 -> 255）
ALTER TABLE `users` MODIFY `email` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- 修改 level 字段长度（20 -> 50）
ALTER TABLE `users` MODIFY `level` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'bronze';

-- 添加 img 字段（如果不存在）
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "img";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column img already exists.' AS result;",
  "ALTER TABLE users ADD COLUMN img LONGTEXT COLLATE utf8mb4_unicode_ci AFTER roles;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 修改 join_date 字段类型为 DATETIME（如果当前是 TIMESTAMP）
-- 注意：如果已经是 DATETIME，这个操作会被忽略

-- ============================================
-- 2. 修改 forum_posts 表 - 添加新字段
-- ============================================

-- 修改 category 字段长度（50 -> 100）
ALTER TABLE `forum_posts` MODIFY `category` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT 'general';

-- 添加 is_sticky 字段
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forum_posts' AND COLUMN_NAME = 'is_sticky') > 0,
  "SELECT 'Column is_sticky already exists.' AS result;",
  "ALTER TABLE forum_posts ADD COLUMN is_sticky TINYINT(1) DEFAULT 0 AFTER likes;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 is_locked 字段
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forum_posts' AND COLUMN_NAME = 'is_locked') > 0,
  "SELECT 'Column is_locked already exists.' AS result;",
  "ALTER TABLE forum_posts ADD COLUMN is_locked TINYINT(1) DEFAULT 0 AFTER is_sticky;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 author 字段（从 users 表同步数据）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forum_posts' AND COLUMN_NAME = 'author') > 0,
  "SELECT 'Column author already exists.' AS result;",
  "ALTER TABLE forum_posts ADD COLUMN author VARCHAR(100) COLLATE utf8mb4_unicode_ci AFTER is_locked;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 author_avatar 字段
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forum_posts' AND COLUMN_NAME = 'author_avatar') > 0,
  "SELECT 'Column author_avatar already exists.' AS result;",
  "ALTER TABLE forum_posts ADD COLUMN author_avatar LONGTEXT COLLATE utf8mb4_unicode_ci AFTER author;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 更新现有的 author 字段数据（从 users 表同步用户名）
UPDATE `forum_posts` fp
JOIN `users` u ON fp.author_id = u.id
SET fp.author = u.username
WHERE fp.author IS NULL OR fp.author = '';

-- 更新现有的 author_avatar 字段数据（从 users 表同步头像）
UPDATE `forum_posts` fp
JOIN `users` u ON fp.author_id = u.id
SET fp.author_avatar = u.avatar
WHERE (fp.author_avatar IS NULL OR fp.author_avatar = '') AND u.avatar IS NOT NULL;

-- ============================================
-- 3. 修改 notifications 表 - 调整结构
-- ============================================

-- 备份旧数据（可选，如果需要保留 user_id 和 message 字段的数据）
-- 注意：2.0 版本不再使用 user_id 和 message 字段

-- 修改 type 字段为 ENUM（需要先处理数据）
-- 先将 type 的值规范化
UPDATE `notifications` SET `type` = 'reply' WHERE `type` LIKE '%reply%';
UPDATE `notifications` SET `type` = 'mention' WHERE `type` LIKE '%mention%';
UPDATE `notifications` SET `type` = 'message' WHERE `type` LIKE '%message%';
UPDATE `notifications` SET `type` = 'system' WHERE `type` LIKE '%system%' OR `type` = '' OR `type` IS NULL;

-- 修改 type 字段类型为 ENUM
ALTER TABLE `notifications` MODIFY `type` ENUM('reply', 'mention', 'message', 'system') COLLATE utf8mb4_unicode_ci NOT NULL;

-- 修改 content 字段类型（varchar(1000) -> TEXT）
ALTER TABLE `notifications` MODIFY `content` TEXT COLLATE utf8mb4_unicode_ci;

-- 确保 recipient_id 不为 NULL（2.0 版本要求 NOT NULL）
-- 注意：代码中仍使用 user_id，但表结构使用 recipient_id
-- 为了兼容，先添加 recipient_id 字段

-- 添加 recipient_id 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'recipient_id') > 0,
  "SELECT 'Column recipient_id already exists.' AS result;",
  "ALTER TABLE notifications ADD COLUMN recipient_id INT NOT NULL AFTER id;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 将 user_id 的数据复制到 recipient_id（如果 user_id 存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'user_id') > 0,
  "UPDATE notifications SET recipient_id = user_id WHERE recipient_id IS NULL OR recipient_id = 0;",
  "SELECT 'user_id does not exist, skipping data sync.' AS result;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 确保 content 字段不为空（如果 message 字段存在，同步数据）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'message') > 0,
  "UPDATE notifications SET content = message WHERE (content IS NULL OR content = '') AND message IS NOT NULL AND message != '';",
  "SELECT 'message column does not exist, skipping data sync.' AS result;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 注意：保留 user_id 和 message 字段以确保代码兼容
-- 如果后续代码已更新，可以删除这些字段：
-- ALTER TABLE `notifications` DROP COLUMN `user_id`;
-- ALTER TABLE `notifications` DROP COLUMN `message`;

-- 添加 updated_at 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'updated_at') > 0,
  "SELECT 'Column updated_at already exists.' AS result;",
  "ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 4. 修改 messages 表 - 字段重命名
-- ============================================
-- 注意：代码中仍使用 receiver_id，但 2.0 表结构使用 recipient_id
-- 为了兼容，先添加 recipient_id 字段，保留 receiver_id
-- 如果代码已更新，可以删除 receiver_id

-- 添加 recipient_id 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'recipient_id') > 0,
  "SELECT 'Column recipient_id already exists.' AS result;",
  "ALTER TABLE messages ADD COLUMN recipient_id INT NOT NULL AFTER sender_id;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 将 receiver_id 的数据复制到 recipient_id（如果 receiver_id 存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'receiver_id') > 0,
  "UPDATE messages SET recipient_id = receiver_id WHERE recipient_id IS NULL OR recipient_id = 0;",
  "SELECT 'receiver_id does not exist, skipping data sync.' AS result;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 updated_at 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'updated_at') > 0,
  "SELECT 'Column updated_at already exists.' AS result;",
  "ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 更新索引（先删除旧的，再添加新的）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_receiver') > 0,
  "ALTER TABLE messages DROP INDEX idx_receiver;",
  "SELECT 'Index idx_receiver does not exist.' AS result;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加新索引（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_recipient') > 0,
  "SELECT 'Index idx_recipient already exists.' AS result;",
  "ALTER TABLE messages ADD KEY idx_recipient (recipient_id);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_conversation') > 0,
  "SELECT 'Index idx_conversation already exists.' AS result;",
  "ALTER TABLE messages ADD KEY idx_conversation (sender_id, recipient_id);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_read_status') > 0,
  "SELECT 'Index idx_read_status already exists.' AS result;",
  "ALTER TABLE messages ADD KEY idx_read_status (is_read);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_created_at') > 0,
  "SELECT 'Index idx_created_at already exists.' AS result;",
  "ALTER TABLE messages ADD KEY idx_created_at (created_at);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 5. 修改 merchants 表
-- ============================================

-- 修改 category 字段为 ENUM
-- 先将现有数据规范化
UPDATE `merchants` SET `category` = 'gold' WHERE `category` = 'gold';
UPDATE `merchants` SET `category` = 'advertiser' WHERE `category` = 'advertiser';
UPDATE `merchants` SET `category` = 'streamer' WHERE `category` = 'streamer';
UPDATE `merchants` SET `category` = 'general' WHERE `category` NOT IN ('gold', 'advertiser', 'streamer');

-- 修改 category 字段类型
ALTER TABLE `merchants` MODIFY `category` ENUM('gold', 'advertiser', 'streamer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'gold';

-- 修改 status 字段为 ENUM
UPDATE `merchants` SET `status` = 'active' WHERE `status` = 'active';
UPDATE `merchants` SET `status` = 'inactive' WHERE `status` = 'inactive';
UPDATE `merchants` SET `status` = 'pending' WHERE `status` NOT IN ('active', 'inactive') OR `status` IS NULL;

ALTER TABLE `merchants` MODIFY `status` ENUM('active', 'inactive', 'pending') COLLATE utf8mb4_unicode_ci DEFAULT 'pending';

-- 修改 contact_info 字段长度
ALTER TABLE `merchants` MODIFY `contact_info` VARCHAR(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- 修改 website 字段长度
ALTER TABLE `merchants` MODIFY `website` VARCHAR(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- 修改 logo_url 字段长度
ALTER TABLE `merchants` MODIFY `logo_url` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- 添加 created_by 字段（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'merchants' AND COLUMN_NAME = 'created_by') > 0,
  "SELECT 'Column created_by already exists.' AS result;",
  "ALTER TABLE merchants ADD COLUMN created_by INT NOT NULL AFTER status;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 设置默认的 created_by 值（使用第一个管理员用户或第一个用户）
SET @default_user_id = (SELECT id FROM users WHERE is_admin = 1 LIMIT 1);
SET @default_user_id = IFNULL(@default_user_id, (SELECT id FROM users LIMIT 1));
UPDATE `merchants` SET `created_by` = @default_user_id WHERE `created_by` = 0 OR `created_by` IS NULL;

-- 添加外键约束（如果不存在）
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'merchants' AND CONSTRAINT_NAME = 'merchants_ibfk_1') > 0,
  "SELECT 'Constraint merchants_ibfk_1 already exists.' AS result;",
  "ALTER TABLE merchants ADD CONSTRAINT merchants_ibfk_1 FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 6. 完全重建 blacklist 表（结构完全不同）
-- ============================================

-- 备份旧黑名单数据（如果需要保留）
-- CREATE TABLE `blacklist_backup` AS SELECT * FROM `blacklist`;

-- 删除旧表
DROP TABLE IF EXISTS `blacklist`;

-- 创建新的黑名单表（用于商户黑名单）
CREATE TABLE `blacklist` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `merchant_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    `violation_type` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    `description` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
    `evidence_urls` TEXT COLLATE utf8mb4_unicode_ci,
    `severity` ENUM('low', 'medium', 'high', 'critical') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
    `status` ENUM('pending', 'verified', 'resolved', 'dismissed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
    `created_by` INT NOT NULL,
    `verified_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `created_by` (`created_by`),
    KEY `verified_by` (`verified_by`),
    CONSTRAINT `blacklist_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `blacklist_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. 处理 user_stats 表
-- ============================================

-- 2.0 版本使用 users 表中的统计字段，不再需要独立的 user_stats 表
-- 如果需要，可以将 user_stats 表的数据同步到 users 表
-- 注意：users 表已经有了 total_posts, total_replies, consecutive_checkins 字段

-- 同步统计数据（如果需要）
UPDATE `users` u
LEFT JOIN `user_stats` us ON u.id = us.user_id
SET 
    u.total_posts = IFNULL(us.total_posts, u.total_posts),
    u.total_replies = IFNULL(us.total_replies, u.total_replies),
    u.consecutive_checkins = IFNULL(us.consecutive_checkins, u.consecutive_checkins),
    u.last_checkin_date = IFNULL(us.last_checkin_date, u.last_checkin_date)
WHERE us.id IS NOT NULL;

-- 删除 user_stats 表（如果不再需要）
-- DROP TABLE IF EXISTS `user_stats`;

-- ============================================
-- 8. 添加索引和约束
-- ============================================

-- forum_posts 表添加索引
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forum_posts' AND INDEX_NAME = 'idx_forum_posts_author') > 0,
  "SELECT 'Index idx_forum_posts_author already exists.' AS result;",
  "ALTER TABLE forum_posts ADD KEY idx_forum_posts_author (author_id);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forum_posts' AND INDEX_NAME = 'idx_forum_posts_category') > 0,
  "SELECT 'Index idx_forum_posts_category already exists.' AS result;",
  "ALTER TABLE forum_posts ADD KEY idx_forum_posts_category (category);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- forum_replies 表添加索引
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forum_replies' AND INDEX_NAME = 'idx_forum_replies_post') > 0,
  "SELECT 'Index idx_forum_replies_post already exists.' AS result;",
  "ALTER TABLE forum_replies ADD KEY idx_forum_replies_post (post_id);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- notifications 表添加索引
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_recipient') > 0,
  "SELECT 'Index idx_recipient already exists.' AS result;",
  "ALTER TABLE notifications ADD KEY idx_recipient (recipient_id);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_type') > 0,
  "SELECT 'Index idx_type already exists.' AS result;",
  "ALTER TABLE notifications ADD KEY idx_type (type);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_read_status') > 0,
  "SELECT 'Index idx_read_status already exists.' AS result;",
  "ALTER TABLE notifications ADD KEY idx_read_status (is_read);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_created_at') > 0,
  "SELECT 'Index idx_created_at already exists.' AS result;",
  "ALTER TABLE notifications ADD KEY idx_created_at (created_at);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'related_post_id') > 0,
  "SELECT 'Index related_post_id already exists.' AS result;",
  "ALTER TABLE notifications ADD KEY related_post_id (related_post_id);"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 9. 更新字符集和排序规则
-- ============================================

-- 确保所有表使用统一的字符集
ALTER TABLE `users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `forum_posts` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `forum_replies` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `notifications` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `messages` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `merchants` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `merchant_reviews` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- 10. 验证迁移结果
-- ============================================

SELECT 
    '迁移完成！' AS status,
    '所有表结构已更新为 2.0 版本' AS message,
    COUNT(*) AS total_users
FROM users;

-- 显示表结构验证
SHOW COLUMNS FROM `forum_posts`;
SHOW COLUMNS FROM `notifications`;
SHOW COLUMNS FROM `messages`;
SHOW COLUMNS FROM `blacklist`;

-- ============================================
-- 完成！
-- ============================================


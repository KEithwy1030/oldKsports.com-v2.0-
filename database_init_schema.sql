-- ============================================
-- Old K Sports 2.0 完整数据库初始化脚本
-- 用于在新项目中创建所有必需的表
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
    email VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    password VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    points INT DEFAULT 0,
    level VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'bronze',
    join_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT NULL,
    is_admin TINYINT(1) DEFAULT 0,
    roles JSON DEFAULT NULL,
    img LONGTEXT COLLATE utf8mb4_unicode_ci,
    avatar LONGTEXT COLLATE utf8mb4_unicode_ci,
    has_uploaded_avatar TINYINT(1) DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    reset_token VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    reset_token_expires DATETIME DEFAULT NULL,
    total_posts INT DEFAULT 0,
    total_replies INT DEFAULT 0,
    consecutive_checkins INT DEFAULT 0,
    last_checkin_date DATE DEFAULT NULL,
    role VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '用户' COMMENT '身份：主播、甲方、服务商、用户等',
    KEY idx_email (email),
    KEY idx_username (username),
    KEY idx_points (points),
    KEY idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 论坛帖子表
CREATE TABLE IF NOT EXISTS forum_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    content TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
    author_id INT NOT NULL,
    category VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT 'general',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    is_sticky TINYINT(1) DEFAULT 0,
    is_locked TINYINT(1) DEFAULT 0,
    author VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    author_avatar LONGTEXT COLLATE utf8mb4_unicode_ci,
    KEY author_id (author_id),
    CONSTRAINT forum_posts_ibfk_1 FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 论坛回复表
CREATE TABLE IF NOT EXISTS forum_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    author_id INT NOT NULL,
    content TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    likes INT DEFAULT 0,
    KEY post_id (post_id),
    KEY author_id (author_id),
    CONSTRAINT forum_replies_ibfk_1 FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    CONSTRAINT forum_replies_ibfk_2 FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    sender_id INT DEFAULT NULL,
    type ENUM('reply', 'mention', 'message', 'system') COLLATE utf8mb4_unicode_ci NOT NULL,
    title VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    content TEXT COLLATE utf8mb4_unicode_ci,
    related_post_id INT DEFAULT NULL,
    related_reply_id INT DEFAULT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_recipient (recipient_id),
    KEY idx_type (type),
    KEY idx_read_status (is_read),
    KEY idx_created_at (created_at),
    KEY sender_id (sender_id),
    KEY related_post_id (related_post_id),
    CONSTRAINT notifications_ibfk_1 FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT notifications_ibfk_2 FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT notifications_ibfk_3 FOREIGN KEY (related_post_id) REFERENCES forum_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_sender (sender_id),
    KEY idx_receiver (receiver_id),
    KEY idx_conversation (sender_id, receiver_id),
    KEY idx_read_status (is_read),
    KEY idx_created_at (created_at),
    CONSTRAINT messages_ibfk_1 FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT messages_ibfk_2 FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商户表
CREATE TABLE IF NOT EXISTS merchants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    description TEXT COLLATE utf8mb4_unicode_ci,
    category ENUM('gold', 'advertiser', 'streamer') COLLATE utf8mb4_unicode_ci NOT NULL,
    contact_info VARCHAR(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY created_by (created_by),
    CONSTRAINT merchants_ibfk_1 FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 黑名单表
CREATE TABLE IF NOT EXISTS blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    merchant_name VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    violation_type VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT 'unspecified',
    description TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
    evidence_urls TEXT COLLATE utf8mb4_unicode_ci,
    report_source ENUM('user', 'platform') COLLATE utf8mb4_unicode_ci DEFAULT 'user',
    created_by INT NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY created_by (created_by),
    CONSTRAINT blacklist_ibfk_1 FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 新手引导任务表
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    reward INT DEFAULT 0,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_shown_at DATETIME DEFAULT NULL,
    dismissed_forever BOOLEAN DEFAULT FALSE,
    progress INT DEFAULT 0,
    target INT DEFAULT 1,
    UNIQUE KEY unique_user_task (user_id, task_id),
    KEY idx_user_id (user_id),
    CONSTRAINT onboarding_tasks_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 创建初始管理员账号（可选）
-- ============================================
-- INSERT INTO users (username, email, password, is_admin, role) 
-- VALUES ('admin', 'admin@oldksports.com', '$2b$10$8tr8vrgRdHBJ42lKB92jl.GJd5Sl9xG8MYZFNBZW58hEqqodCIGC2', 1, '管理员');

-- ============================================
-- 完成！
-- ============================================
-- 所有表结构已创建完毕
-- 数据库初始化完成！


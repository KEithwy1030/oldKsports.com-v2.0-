-- ============================================
-- 修复帖子内容中的换行符：将字面的 \n 转换为真正的换行符
-- ============================================
-- 说明：将数据库中存储的字面字符串 "\n" 替换为真正的换行符（CHAR(10)）
-- 执行时间：2025-01-XX
-- ============================================

USE oldksports;

-- 备份提示
SELECT '开始修复换行符...' AS status;
SELECT '修复前统计:' AS info;
SELECT 
    COUNT(*) as total_posts,
    COUNT(CASE WHEN content LIKE '%\\n%' THEN 1 END) as posts_with_literal_n
FROM forum_posts;

SELECT 
    COUNT(*) as total_replies,
    COUNT(CASE WHEN content LIKE '%\\n%' THEN 1 END) as replies_with_literal_n
FROM forum_replies;

-- 修复帖子内容：将字面的 \n 替换为真正的换行符
-- 注意：MySQL中 REPLACE 需要转义反斜杠，所以 '\\n' 表示字面的 \n 字符串
UPDATE forum_posts 
SET content = REPLACE(content, '\\n', CHAR(10))
WHERE content LIKE '%\\n%';

-- 修复回复内容：将字面的 \n 替换为真正的换行符
UPDATE forum_replies 
SET content = REPLACE(content, '\\n', CHAR(10))
WHERE content LIKE '%\\n%';

-- 验证修复结果
SELECT '修复完成！' AS status;
SELECT '修复后统计:' AS info;
SELECT 
    COUNT(*) as total_posts,
    COUNT(CASE WHEN content LIKE '%\\n%' THEN 1 END) as posts_with_literal_n_remaining,
    COUNT(CASE WHEN content LIKE '%' || CHAR(10) || '%' THEN 1 END) as posts_with_real_newline
FROM forum_posts;

SELECT 
    COUNT(*) as total_replies,
    COUNT(CASE WHEN content LIKE '%\\n%' THEN 1 END) as replies_with_literal_n_remaining,
    COUNT(CASE WHEN content LIKE '%' || CHAR(10) || '%' THEN 1 END) as replies_with_real_newline
FROM forum_replies;

-- 显示修复后的示例
SELECT '修复后的示例:' AS info;
SELECT id, title, LEFT(content, 100) as content_preview 
FROM forum_posts 
WHERE content LIKE '%' || CHAR(10) || '%' 
LIMIT 3;


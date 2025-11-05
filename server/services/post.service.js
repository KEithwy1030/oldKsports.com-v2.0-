// server/services/post.service.js
import { getDb } from '../db.js';
import userStatsService from './userStats.service.js';
import NotificationService from './notification.service.js';

// 复用连接池实例，避免未定义的 db 访问
const db = getDb();

// 统一分类映射：支持中文名称与英文ID互通
const normalizeCategory = (rawCategory) => {
    if (!rawCategory) return null; // null 表示不筛选
    const text = String(rawCategory).trim();
    const map = {
        '行业茶水间': 'general',
        '商务＆合作': 'business',
        '商务&合作': 'business',
        '黑榜曝光': 'news',
        'all': null,
        '全部': null
    };
    if (['general', 'business', 'news'].includes(text)) return text;
    return map.hasOwnProperty(text) ? map[text] : text;
};

export const findPosts = (category) => {
    return new Promise((resolve, reject) => {
        // 连接池在 getDb() 内部已确保可用，不再读取未定义的 db.state

        const normalized = normalizeCategory(category);

        // 修改查询以包含最新回复时间和回复数量，并按最新活动时间排序
        const q = normalized ? 
            `SELECT p.id, p.title, p.content, p.category, p.created_at, p.updated_at, p.views, p.likes, u.id as author_id, u.username, u.avatar,
             COALESCE(MAX(r.created_at), p.created_at) as latest_activity,
             COUNT(r.id) as reply_count
             FROM users u 
             JOIN forum_posts p ON u.id = p.author_id 
             LEFT JOIN forum_replies r ON p.id = r.post_id 
             WHERE p.category=?
             GROUP BY p.id, p.content, p.category, p.created_at, p.updated_at, p.views, p.likes, u.id, u.username, u.avatar
             ORDER BY latest_activity DESC` :
            `SELECT p.id, p.title, p.content, p.category, p.created_at, p.updated_at, p.views, p.likes, u.id as author_id, u.username, u.avatar,
             COALESCE(MAX(r.created_at), p.created_at) as latest_activity,
             COUNT(r.id) as reply_count
             FROM users u 
             JOIN forum_posts p ON u.id = p.author_id 
             LEFT JOIN forum_replies r ON p.id = r.post_id 
             GROUP BY p.id, p.content, p.category, p.created_at, p.updated_at, p.views, p.likes, u.id, u.username, u.avatar
             ORDER BY latest_activity DESC`;
        const params = normalized ? [normalized] : [];
        
        console.log('查询帖子SQL:', q);
        console.log('查询参数:', params);
        
        db.query(q, params, (err, data) => {
            if (err) {
                console.error('查询帖子失败:', err.message);
                return resolve([]); // 返回空数组而不是拒绝
            }
            console.log('查询帖子成功，返回数据:', data.length, '条记录');
            
            // 标准化数据格式，确保前端能正确获取
            const normalizedData = data.map(post => ({
                ...post,
                author: post.username,
                author_id: post.author_id,
                timestamp: post.created_at
            }));
            
            resolve(normalizedData);
        });
    });
};

export const findPostById = (postId) => {
    return new Promise((resolve, reject) => {
        // 首先获取帖子信息 - 添加author_id字段
        const postQuery = "SELECT p.id, p.title, p.content, p.category, p.created_at, p.updated_at, p.views, p.likes, u.id as author_id, u.username, u.avatar, u.avatar AS userImg FROM users u JOIN forum_posts p ON u.id = p.author_id WHERE p.id = ?";
        getDb().query(postQuery, [postId], (err, postData) => {
            if (err) return reject(err);
            if (!postData || postData.length === 0) return resolve(null);
            
            const post = postData[0];
            
            // 添加时间字段别名，确保前端能正确获取
            post.timestamp = post.created_at;
            post.author = post.username;
            
            console.log('🔍 帖子详情查询结果:', {
                id: post.id,
                title: post.title,
                author: post.author,
                author_id: post.author_id,
                timestamp: post.timestamp
            });
            
            // 然后获取该帖子的回复
            // 使用 COALESCE 在用户缺失时提供兜底昵称，并统一时间别名为 createdAt
            const repliesQuery = "SELECT r.id, r.content, r.author_id, r.created_at AS createdAt, r.likes, COALESCE(u.username, CONCAT('用户#', r.author_id)) AS author FROM forum_replies r LEFT JOIN users u ON r.author_id = u.id WHERE r.post_id = ? ORDER BY r.created_at ASC";
            getDb().query(repliesQuery, [postId], (err, repliesData) => {
                if (err) return reject(err);
                
                // 将回复添加到帖子对象中
                post.replies = repliesData || [];
                resolve(post);
            });
        });
    });
};

export const createPost = async (postData, userId) => {
    try {
        // 验证必需参数
        if (!postData || !userId) {
            throw new Error("Missing required parameters");
        }
        
        // 验证帖子数据
        if (!postData.title || !postData.content) {
            throw new Error("Title and content are required");
        }
        
        // 检查是否已存在相同标题的帖子
        const existingPosts = await new Promise((resolve, reject) => {
            getDb().query("SELECT id FROM forum_posts WHERE title = ?", [postData.title], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        if (existingPosts.length > 0) {
            throw new Error("帖子标题已存在，请使用不同的标题");
        }
        
        // 直接使用author_id，不需要author字段
        const q = "INSERT INTO forum_posts(`title`, `content`, `category`, `author_id`, `created_at`) VALUES (?, ?, ?, ?, ?)";
        
        // 确保所有参数都不是undefined，使用null代替
        const values = [ 
            postData.title || null, 
            postData.content || null, 
            normalizeCategory(postData.category) || 'general', 
            userId || null, 
            new Date() 
        ];
        
        console.log('创建帖子参数:', { postData, userId, values });
        
        await new Promise((resolve, reject) => {
            getDb().query(q, values, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        // 更新用户发帖统计
        await userStatsService.incrementUserPosts(userId);
        
        return { success: true, message: "Post has been created." };
    } catch (error) {
        console.error('创建帖子失败:', error);
        throw error;
    }
};

export const deletePost = (postId, userId, isAdmin = false) => {
    return new Promise((resolve, reject) => {
        console.log('🗑️ 删帖服务详情:', { 
            postId, 
            userId, 
            isAdmin, 
            isAdminType: typeof isAdmin,
            isAdminValue: isAdmin 
        });
        
        // 管理员可以删除任何帖子，普通用户只能删除自己的帖子
        const q = isAdmin 
            ? "DELETE FROM forum_posts WHERE `id` = ?" 
            : "DELETE FROM forum_posts WHERE `id` = ? AND `author_id` = ?";
        const params = isAdmin ? [postId] : [postId, userId];
        
        console.log('📝 执行SQL:', q);
        console.log('📝 SQL参数:', params);
        console.log('📝 管理员权限:', isAdmin ? '是' : '否');
        
        getDb().query(q, params, (err, data) => {
            if (err) {
                console.error('❌ 删除SQL错误:', err);
                return reject(err);
            }
            console.log('📊 删除结果:', {
                affectedRows: data.affectedRows,
                changedRows: data.changedRows,
                insertId: data.insertId
            });
            
            if (data.affectedRows === 0) {
                console.log('🚫 没有行被删除，可能是权限不足或帖子不存在');
                return reject(new Error("Forbidden"));
            }
            
            console.log('✅ 删帖成功');
            resolve("Post has been deleted!");
        });
    });
};

export const updatePost = (postData, postId, userId, isAdmin = false) => {
    return new Promise((resolve, reject) => {
        // 构建动态SQL，只更新提供的字段
        const updates = [];
        const values = [];
        
        if (postData.title !== undefined) {
            updates.push('`title`=?');
            values.push(postData.title);
        }
        if (postData.content !== undefined) {
            updates.push('`content`=?');
            values.push(postData.content);
        }
        if (postData.category !== undefined) {
            // 规范化category值，确保数据库存储正确
            const normalizedCategory = normalizeCategory(postData.category) || 'general';
            updates.push('`category`=?');
            values.push(normalizedCategory);
        }
        
        if (updates.length === 0) {
            return reject(new Error("No fields to update"));
        }
        
        // 管理员可以更新任何帖子，普通用户只能更新自己的帖子
        const q = isAdmin 
            ? `UPDATE forum_posts SET ${updates.join(', ')} WHERE \`id\` = ?`
            : `UPDATE forum_posts SET ${updates.join(', ')} WHERE \`id\` = ? AND \`author_id\` = ?`;
        const params = isAdmin ? [...values, postId] : [...values, postId, userId];
        
        console.log('📝 更新帖子SQL:', q);
        console.log('📝 SQL参数:', params);
        console.log('📝 管理员权限:', isAdmin ? '是' : '否');
        
        getDb().query(q, params, (err, data) => {
            if (err) {
                console.error('❌ 更新SQL错误:', err);
                return reject(err);
            }
            
            console.log('📊 更新结果:', {
                affectedRows: data.affectedRows,
                changedRows: data.changedRows
            });
            
            if (data.affectedRows === 0) {
                console.log('🚫 没有行被更新，可能是权限不足或帖子不存在');
                return reject(new Error("Forbidden"));
            }
            
            console.log('✅ 更新帖子成功');
            resolve("Post has been updated.");
        });
    });
};

export const addReply = async (replyData, postId, userId) => {
    try {
        // 首先获取用户名
        const userRows = await new Promise((resolve, reject) => {
            getDb().query("SELECT username FROM users WHERE id = ?", [userId], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        if (userRows.length === 0) throw new Error("User not found");
        
        const username = userRows[0].username;
        
        // 获取帖子信息和作者ID
        const postRows = await new Promise((resolve, reject) => {
            getDb().query("SELECT title, author_id FROM forum_posts WHERE id = ?", [postId], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        if (postRows.length === 0) throw new Error("Post not found");
        
        const post = postRows[0];
        const postAuthorId = post.author_id;
        const postTitle = post.title;
        
        // 插入回复到数据库
        const q = "INSERT INTO forum_replies(`post_id`, `author_id`, `content`, `created_at`) VALUES (?, ?, ?, ?)";
        const values = [postId, userId, replyData.content, new Date()];
        
        const insertResult = await new Promise((resolve, reject) => {
            getDb().query(q, values, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        const replyId = insertResult.insertId;
        
        // 更新用户回复统计
        await userStatsService.incrementUserReplies(userId);
        
        // 创建回复通知（如果不是自己回复自己的帖子）
        if (postAuthorId !== userId) {
            try {
                await NotificationService.createReplyNotification(
                    postAuthorId, 
                    userId, 
                    postId, 
                    replyId, 
                    postTitle
                );
                console.log('回复通知创建成功');
            } catch (notifyError) {
                console.error('创建回复通知失败:', notifyError);
                // 不影响主要功能，继续执行
            }
        }
        
        // 处理@提及通知
        try {
            await NotificationService.processMentions(replyData.content, userId, postId, replyId);
            console.log('@提及通知处理完成');
        } catch (mentionError) {
            console.error('处理@提及失败:', mentionError);
            // 不影响主要功能，继续执行
        }
        
        return "Reply has been added.";
    } catch (error) {
        console.error('添加回复失败:', error);
        throw error;
    }
};
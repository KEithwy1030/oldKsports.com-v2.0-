import express from 'express';
import { getDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 获取用户未读通知数量
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        COUNT(*) as total_unread,
        SUM(CASE WHEN type = 'reply' THEN 1 ELSE 0 END) as reply_count,
        SUM(CASE WHEN type = 'mention' THEN 1 ELSE 0 END) as mention_count,
        SUM(CASE WHEN type = 'message' THEN 1 ELSE 0 END) as message_count,
        SUM(CASE WHEN type = 'system' THEN 1 ELSE 0 END) as system_count
      FROM notifications 
      WHERE recipient_id = ? AND is_read = FALSE
    `;
    
    console.log('🔔 获取未读通知数量查询:', query);
    console.log('🔔 用户ID:', userId);
    
    getDb().query(query, [userId], (err, results) => {
      if (err) {
        console.error('❌ 获取未读通知数量失败:', err);
        return res.status(500).json({ success: false, error: '获取通知失败' });
      }
      
      const counts = results[0];
      console.log('🔔 未读通知数量结果:', counts);
      
      res.json({
        success: true,
        data: {
          total: parseInt(counts.total_unread) || 0,
          reply: parseInt(counts.reply_count) || 0,
          mention: parseInt(counts.mention_count) || 0,
          message: parseInt(counts.message_count) || 0,
          system: parseInt(counts.system_count) || 0
        }
      });
    });
  } catch (error) {
    console.error('获取未读通知数量错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 获取用户通知列表
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE n.recipient_id = ?';
    let queryParams = [userId];
    
    if (type && ['reply', 'mention', 'message', 'system'].includes(type)) {
      whereClause += ' AND n.type = ?';
      queryParams.push(type);
    }
    
    const query = `
      SELECT 
        n.id,
        n.recipient_id,
        n.title,
        n.content,
        n.type,
        n.is_read,
        n.created_at
      FROM notifications n
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    console.log('🔔 完整SQL查询:', query);
    console.log('🔔 查询参数详情:', queryParams);
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    console.log('🔔 获取通知列表查询:', query);
    console.log('🔔 查询参数:', queryParams);
    
    getDb().query(query, queryParams, (err, results) => {
      if (err) {
        console.error('❌ 获取通知列表失败:', {
          error: err.message,
          code: err.code,
          errno: err.errno,
          sqlState: err.sqlState,
          sql: query,
          params: queryParams
        });
        return res.status(500).json({ 
          success: false, 
          error: '获取通知失败',
          details: err.message 
        });
      }
      
      console.log('🔔 通知查询结果:', {
        count: results.length,
        results: results
      });
      
      res.json({
        success: true,
        data: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: results.length
        }
      });
    });
  } catch (error) {
    console.error('获取通知列表错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 标记通知为已读
router.put('/mark-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds, type } = req.body;
    
    let query;
    let queryParams;
    
    if (notificationIds && Array.isArray(notificationIds)) {
      // 标记指定通知为已读
      const placeholders = notificationIds.map(() => '?').join(',');
      query = `UPDATE notifications SET is_read = TRUE WHERE id IN (${placeholders}) AND recipient_id = ?`;
      queryParams = [...notificationIds, userId];
    } else if (type) {
      // 标记某类型的所有通知为已读
      query = 'UPDATE notifications SET is_read = TRUE WHERE recipient_id = ? AND type = ?';
      queryParams = [userId, type];
    } else {
      // 标记所有通知为已读
      query = 'UPDATE notifications SET is_read = TRUE WHERE recipient_id = ?';
      queryParams = [userId];
    }
    
    getDb().query(query, queryParams, (err, result) => {
      if (err) {
        console.error('标记通知已读失败:', err);
        return res.status(500).json({ success: false, error: '标记失败' });
      }
      
      res.json({
        success: true,
        message: '通知已标记为已读',
        affectedRows: result.affectedRows
      });
    });
  } catch (error) {
    console.error('标记通知已读错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 创建新通知（内部使用）
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { recipientId, senderId, type, title, content, relatedPostId, relatedReplyId } = req.body;
    
    // 验证通知类型
    if (!['reply', 'mention', 'message', 'system'].includes(type)) {
      return res.status(400).json({ success: false, error: '无效的通知类型' });
    }
    
    const query = `
      INSERT INTO notifications (recipient_id, title, content, type, is_read)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    getDb().query(query, [recipientId, title, content, type, false], (err, result) => {
      if (err) {
        console.error('创建通知失败:', err);
        return res.status(500).json({ success: false, error: '创建通知失败' });
      }
      
      res.json({
        success: true,
        message: '通知创建成功',
        notificationId: result.insertId
      });
    });
  } catch (error) {
    console.error('创建通知错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 删除通知
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    const query = 'DELETE FROM notifications WHERE id = ? AND recipient_id = ?';
    
    getDb().query(query, [notificationId, userId], (err, result) => {
      if (err) {
        console.error('删除通知失败:', err);
        return res.status(500).json({ success: false, error: '删除失败' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: '通知不存在或无权限删除' });
      }
      
      res.json({
        success: true,
        message: '通知删除成功'
      });
    });
  } catch (error) {
    console.error('删除通知错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 发送测试通知给所有用户（管理员功能）
router.post('/send-test', authenticateToken, async (req, res) => {
  try {
    // 检查是否为管理员
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: '只有管理员可以发送测试通知' 
      });
    }
    
    console.log('🚀 管理员发送测试通知请求');
    
    // 获取所有用户
    const users = await new Promise((resolve, reject) => {
      getDb().query('SELECT id, username FROM users', (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    console.log(`📊 找到 ${users.length} 个用户`);
    
    // 为每个用户创建测试通知
    const results = [];
    for (const user of users) {
      try {
        const query = `
          INSERT INTO notifications (recipient_id, title, content, type, is_read)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        await new Promise((resolve, reject) => {
          getDb().query(query, [
            user.id,
            '🎉 系统测试通知',
            `您好 ${user.username}！\n\n这是一个系统测试通知，用于验证通知功能是否正常工作。\n\n如果您能看到这条通知，说明通知系统已经成功修复！\n\n感谢您的耐心等待！`,
            'system',
            false
          ], (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        
        console.log(`✅ 用户 ${user.username} (ID: ${user.id}) 通知创建成功`);
        results.push({ userId: user.id, username: user.username, success: true });
      } catch (error) {
        console.error(`❌ 用户 ${user.username} (ID: ${user.id}) 通知创建失败:`, error.message);
        results.push({ userId: user.id, username: user.username, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`📋 测试通知发送完成: 成功 ${successCount}, 失败 ${failCount}`);
    
    res.json({
      success: true,
      message: '测试通知发送完成',
      data: {
        totalUsers: users.length,
        successCount,
        failCount,
        results
      }
    });
  } catch (error) {
    console.error('❌ 发送测试通知失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '发送测试通知失败',
      details: error.message 
    });
  }
});

// 发送欢迎通知给所有用户（管理员功能）
router.post('/send-welcome', authenticateToken, async (req, res) => {
  try {
    // 检查是否为管理员
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: '只有管理员可以发送欢迎通知' 
      });
    }
    
    console.log('🎉 管理员发送欢迎通知请求');
    
    // 获取所有用户
    const users = await new Promise((resolve, reject) => {
      getDb().query('SELECT id, username FROM users', (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    console.log(`📊 找到 ${users.length} 个用户`);
    
    // 为每个用户创建欢迎通知
    const results = [];
    for (const user of users) {
      try {
        const query = `
          INSERT INTO notifications (recipient_id, title, content, type, is_read)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        await new Promise((resolve, reject) => {
          getDb().query(query, [
            user.id,
            '🎉 欢迎加入OldKSports体育社区！',
            `亲爱的 ${user.username}，\n\n欢迎您加入OldKSports体育社区！\n\n在这里您可以：\n• 发布体育相关的帖子和讨论\n• 与其他体育爱好者交流互动\n• 分享您的体育见解和经验\n• 参与社区活动和话题讨论\n\n我们致力于打造一个专业的体育自媒体社区，让每一位体育爱好者都能找到属于自己的位置。\n\n感谢您的加入，期待您的精彩内容！\n\n—— OldKSports团队`,
            'system',
            false
          ], (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        
        console.log(`✅ 用户 ${user.username} (ID: ${user.id}) 欢迎通知创建成功`);
        results.push({ userId: user.id, username: user.username, success: true });
      } catch (error) {
        console.error(`❌ 用户 ${user.username} (ID: ${user.id}) 欢迎通知创建失败:`, error.message);
        results.push({ userId: user.id, username: user.username, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`📋 欢迎通知发送完成: 成功 ${successCount}, 失败 ${failCount}`);
    
    res.json({
      success: true,
      message: '欢迎通知发送完成',
      data: {
        totalUsers: users.length,
        successCount,
        failCount,
        results
      }
    });
  } catch (error) {
    console.error('❌ 发送欢迎通知失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '发送欢迎通知失败',
      details: error.message 
    });
  }
});

export default router;

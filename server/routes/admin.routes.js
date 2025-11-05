// server/routes/admin.routes.fixed.js
// 修复后的管理员路由文件
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDb } from '../db.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 获取数据库连接实例
const db = getDb();

// 管理员权限中间件
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: '需要管理员权限'
    });
  }
  next();
};

// 数据库查询辅助函数
const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// 管理员仪表板统计（全部真实数据）
router.get('/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 总量统计
    const userStats = await dbQuery('SELECT COUNT(*) as total_users FROM users');
    const postStats = await dbQuery('SELECT COUNT(*) as total_posts FROM forum_posts');
    const replyStats = await dbQuery('SELECT COUNT(*) as total_replies FROM forum_replies');

    // 今日新增统计
    const todayPosts = await dbQuery("SELECT COUNT(*) as today_posts FROM forum_posts WHERE DATE(created_at) = CURDATE()");
    const todayReplies = await dbQuery("SELECT COUNT(*) as today_replies FROM forum_replies WHERE DATE(created_at) = CURDATE()");

    // 在线用户（近10分钟有登录或活跃）
    const onlineUsersRows = await dbQuery(
      `SELECT COUNT(*) AS online_users
       FROM users 
       WHERE last_login IS NOT NULL AND TIMESTAMPDIFF(MINUTE, last_login, NOW()) <= 10`
    );
    const onlineUsers = onlineUsersRows?.[0]?.online_users || 0;

    res.json({
      success: true,
      data: {
        totalUsers: (userStats?.[0]?.total_users) || 0,
        totalPosts: (postStats?.[0]?.total_posts) || 0,
        totalReplies: (replyStats?.[0]?.total_replies) || 0,
        onlineUsers,
        todayPosts: (todayPosts?.[0]?.today_posts) || 0,
        todayReplies: (todayReplies?.[0]?.today_replies) || 0,
        // 预留增长数据结构，前端做了 length 判断
        userGrowth: [],
        postGrowth: []
      }
    });
  } catch (error) {
    console.error('获取仪表板统计失败:', error);
    res.status(500).json({ success: false, error: '获取统计信息失败' });
  }
});

// 管理员活动日志（仅返回结构化的注册/发帖事件，避免返回HTML内容）
router.get('/dashboard/activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 最近注册用户（使用 join_date 作为真实注册时间，如果为空则使用 created_at）
    const recentRegistrations = await dbQuery(`
      SELECT 
        'register' AS type,
        u.username AS username,
        NULL AS title,
        NULL AS category,
        COALESCE(u.join_date, u.created_at) AS timestamp
      FROM users u
      ORDER BY COALESCE(u.join_date, u.created_at) DESC
      LIMIT 10
    `);

    // 最近发帖（仅返回标题与分类，不返回正文）
    const recentPosts = await dbQuery(`
      SELECT 
        'post' AS type,
        u.username AS username,
        p.title AS title,
        p.category AS category,
        p.created_at AS timestamp
      FROM forum_posts p
      JOIN users u ON p.author_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    // 合并并按时间倒序
    const merged = [...recentRegistrations, ...recentPosts]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('获取活动日志失败:', error);
    res.status(500).json({ success: false, error: '获取活动日志失败' });
  }
});

// 系统状态检查（前端期望包含 server/database/storage 三段）
router.get('/system/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 检查数据库连接
    await dbQuery('SELECT 1 as health_check');

    // 服务器状态（进程与时间）
    const serverStatus = { status: 'normal', message: 'Server is running', uptimeSec: Math.floor(process.uptime()) };

    // 存储使用（统计 uploads 目录体积，作为简化指标）
    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'images');
    let totalBytes = 0;
    try {
      if (fs.existsSync(uploadsRoot)) {
        const files = fs.readdirSync(uploadsRoot);
        for (const f of files) {
          const fp = path.join(uploadsRoot, f);
          const stat = fs.statSync(fp);
          if (stat.isFile()) totalBytes += stat.size;
        }
      }
    } catch (_) { /* ignore */ }
    // 以 2GB 为参考容量估算占用百分比，避免读取磁盘分区信息带来跨平台差异
    const referenceCapacity = 2 * 1024 * 1024 * 1024; // 2GB
    const usage = Math.min(100, Math.round((totalBytes / referenceCapacity) * 100));
    const storageStatus = { status: 'normal', usage, message: 'Uploads OK' };

    res.json({
      success: true,
      data: {
        server: serverStatus,
        database: { status: 'normal', message: 'Database connected' },
        storage: storageStatus
      }
    });
  } catch (error) {
    console.error('系统状态检查失败:', error);
    res.status(500).json({
      success: false,
      error: '系统状态检查失败',
      data: {
        server: { status: 'degraded', message: 'Server error' },
        database: { status: 'error', message: 'Database disconnected' },
        storage: { status: 'unknown', usage: 0, message: 'Unknown' }
      }
    });
  }
});

// 用户管理
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbQuery(`
      SELECT id, username, email, points, is_admin, created_at, join_date, last_login 
      FROM users 
      ORDER BY COALESCE(join_date, created_at) DESC
    `);
    
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, error: '获取用户列表失败' });
  }
});

// 删除用户
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await dbQuery('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ success: false, error: '删除用户失败' });
  }
});

// 商家管理相关路由
// 获取所有商家
router.get('/merchants', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const merchants = await dbQuery('SELECT * FROM merchants ORDER BY created_at DESC');
    res.json({ success: true, data: merchants });
  } catch (error) {
    console.error('获取商家列表失败:', error);
    res.status(500).json({ success: false, error: '获取商家列表失败' });
  }
});

// 添加商家
router.post('/merchants', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description = '', category = 'gold', contact_info = null } = req.body || {};

    if (!name) {
      return res.status(400).json({ success: false, error: '缺少必填字段：name' });
    }

    const result = await dbQuery(
      'INSERT INTO merchants (name, description, category, contact_info, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, description, category, contact_info, req.user.id]
    );

    res.json({ success: true, message: '商家添加成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('添加商家失败:', error);
    res.status(500).json({ success: false, error: '添加商家失败' });
  }
});

// 更新商家
router.put('/merchants/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, contact_info } = req.body;
    
    const result = await dbQuery(
      'UPDATE merchants SET name = ?, description = ?, category = ?, contact_info = ?, updated_at = NOW() WHERE id = ?',
      [name, description, category, contact_info, id]
    );

    res.json({ success: true, message: '商家更新成功' });
  } catch (error) {
    console.error('更新商家失败:', error);
    res.status(500).json({ success: false, error: '更新商家失败' });
  }
});

// 删除商家
router.delete('/merchants/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await dbQuery('DELETE FROM merchants WHERE id = ?', [id]);
    
    res.json({ success: true, message: '商家删除成功' });
  } catch (error) {
    console.error('删除商家失败:', error);
    res.status(500).json({ success: false, error: '删除商家失败' });
  }
});

// 更新商家状态
router.patch('/merchants/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await dbQuery(
      'UPDATE merchants SET status = ? WHERE id = ?',
      [status, id]
    );
    
    res.json({ success: true, message: '商家状态更新成功' });
  } catch (error) {
    console.error('更新商家状态失败:', error);
    res.status(500).json({ success: false, error: '更新商家状态失败' });
  }
});

// 黑榜管理相关路由
// 获取公开黑榜记录（无需登录）
router.get('/blacklist/public', async (req, res) => {
  try {
    const entries = await dbQuery(`
      SELECT 
        id,
        IFNULL(merchant_name,'') as name,
        violation_type,
        IFNULL(description,'') as description,
        evidence_urls as contact_info,
        created_at,
        created_by,
        COALESCE(report_source, 'user') as report_source
      FROM blacklist
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('获取公开黑榜列表失败:', error);
    res.status(500).json({ success: false, error: '获取公开黑榜列表失败' });
  }
});

// 获取所有黑榜记录（管理员）
router.get('/blacklist', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const entries = await dbQuery(`
      SELECT 
        b.id,
        IFNULL(b.merchant_name,'') AS name,
        IFNULL(b.description,'') AS description,
        b.violation_type,
        b.evidence_urls AS contact_info,
        b.created_at,
        b.created_by,
        COALESCE(b.report_source, 'user') as report_source,
        u1.username as creator_username
      FROM blacklist b
      LEFT JOIN users u1 ON b.created_by = u1.id
      ORDER BY b.created_at DESC
    `);
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('获取黑榜列表失败:', error);
    res.status(500).json({ success: false, error: '获取黑榜列表失败' });
  }
});

// 添加黑榜记录
router.post('/blacklist', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const merchant_name_raw = body.merchant_name ?? body.name ?? '';
    const description_raw = body.description ?? '';
    const violation_type = (body.violation_type ?? 'unspecified').toString();
    const evidence_urls = (body.evidence_urls ?? body.contact_info ?? null) || null;
    const report_source = (body.report_source ?? null);

    const merchant_name = (typeof merchant_name_raw === 'string' ? merchant_name_raw : String(merchant_name_raw || '')).trim();
    const description = (typeof description_raw === 'string' ? description_raw : String(description_raw || '')).trim();

    if (!merchant_name || !description) {
      return res.status(400).json({ success: false, error: '缺少必填字段：merchant_name 或 description' });
    }

    let result;
    try {
      result = await dbQuery(
        'INSERT INTO blacklist (merchant_name, violation_type, description, evidence_urls, report_source, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [merchant_name, violation_type, description, evidence_urls, report_source, req.user.id]
      );
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('unknown column') && msg.includes('report_source')) {
        result = await dbQuery(
          'INSERT INTO blacklist (merchant_name, violation_type, description, evidence_urls, created_by) VALUES (?, ?, ?, ?, ?)',
          [merchant_name, violation_type, description, evidence_urls, req.user.id]
        );
      } else {
        throw err;
      }
    }

    res.json({ success: true, message: '黑榜记录添加成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('添加黑榜记录失败:', error);
    res.status(500).json({ success: false, error: '添加黑榜记录失败' });
  }
});

// 更新黑榜记录
router.put('/blacklist/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const merchant_name = (body.merchant_name ?? body.name ?? '').toString();
    const description = (body.description ?? '').toString();
    const violation_type = (body.violation_type ?? 'unspecified').toString();
    const evidence_urls = (body.evidence_urls ?? body.contact_info ?? null) || null;
    const report_source = (body.report_source ?? undefined);

    const fields = ['merchant_name = ?', 'violation_type = ?', 'description = ?', 'evidence_urls = ?'];
    const values = [merchant_name, violation_type, description, evidence_urls];
    if (report_source) { fields.push('report_source = ?'); values.push(report_source); }
    fields.push('updated_at = NOW()');
    values.push(id);

    let result;
    try {
      result = await dbQuery(
        `UPDATE blacklist SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('unknown column') && msg.includes('report_source')) {
        const idx = fields.findIndex(f => f.startsWith('report_source'));
        if (idx !== -1) {
          fields.splice(idx, 1);
          values.splice(idx, 1);
        }
        result = await dbQuery(
          `UPDATE blacklist SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      } else {
        throw err;
      }
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '黑榜记录未找到' });
    }
    
    res.json({ success: true, message: '黑榜记录更新成功' });
  } catch (error) {
    console.error('更新黑榜记录失败:', error);
    res.status(500).json({ success: false, error: '更新黑榜记录失败' });
  }
});

// 删除黑榜记录
router.delete('/blacklist/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await dbQuery('DELETE FROM blacklist WHERE id = ?', [id]);
    
    res.json({ success: true, message: '黑榜记录删除成功' });
  } catch (error) {
    console.error('删除黑榜记录失败:', error);
    res.status(500).json({ success: false, error: '删除黑榜记录失败' });
  }
});

// 清空黑榜数据（仅开发/测试使用）
router.delete('/blacklist', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 仅在开发环境启用防护
    const env = process.env.NODE_ENV || 'development';
    if (env !== 'development' && env !== 'test') {
      return res.status(403).json({ success: false, error: '仅限开发/测试环境使用' });
    }

    await dbQuery('TRUNCATE TABLE blacklist');
    res.json({ success: true, message: '已清空黑榜数据（开发环境）' });
  } catch (error) {
    console.error('清空黑榜数据失败:', error);
    // 如果因外键或权限导致 TRUNCATE 失败，降级为 DELETE + 自增重置
    try {
      await dbQuery('DELETE FROM blacklist');
      await dbQuery('ALTER TABLE blacklist AUTO_INCREMENT = 1');
      return res.json({ success: true, message: '已删除所有黑榜记录并重置自增ID' });
    } catch (e2) {
      console.error('降级清理失败:', e2);
      return res.status(500).json({ success: false, error: '清空黑榜数据失败' });
    }
  }
});

// 验证黑榜记录
router.patch('/blacklist/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    // 前端传 { status }，兼容旧参数 verified/verification_notes
    const status = body.status;
    const verified = body.verified;
    const verification_notes = body.verification_notes;

    const updates = [];
    const values = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
      if (status === 'verified') {
        updates.push('verified_by = ?', 'verified_at = NOW()');
        values.push(req.user.id);
      }
    }
    if (verified !== undefined) { updates.push('verified = ?'); values.push(verified); }
    if (verification_notes !== undefined) { updates.push('verification_notes = ?'); values.push(verification_notes); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: '缺少可更新字段' });
    }

    values.push(id);
    const baseSql = `UPDATE blacklist SET ${updates.join(', ')} WHERE id = ?`;
    try {
      await dbQuery(baseSql, values);
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      // 兼容老表：若不存在 verified_at 或 verified 字段，则移除相关更新后重试
      if (msg.includes("unknown column 'verified_at'") || msg.includes('unknown column `verified_at`') || msg.includes('unknown column verified_at')) {
        const filtered = [];
        const filteredValues = [];
        let valueIdx = 0;
        for (const u of updates) {
          const hasVerifiedAt = u.includes('verified_at');
          if (!hasVerifiedAt) {
            filtered.push(u);
            filteredValues.push(values[valueIdx]);
          }
          valueIdx += 1;
        }
        filteredValues.push(id);
        const sql2 = `UPDATE blacklist SET ${filtered.join(', ')} WHERE id = ?`;
        await dbQuery(sql2, filteredValues);
      } else if (msg.includes("unknown column 'verified'") || msg.includes('unknown column `verified`') || msg.includes('unknown column verified')) {
        const filtered = [];
        const filteredValues = [];
        let valueIdx = 0;
        for (const u of updates) {
          const hasVerified = u.includes('verified =');
          if (!hasVerified) {
            filtered.push(u);
            filteredValues.push(values[valueIdx]);
          }
          valueIdx += 1;
        }
        filteredValues.push(id);
        const sql2 = `UPDATE blacklist SET ${filtered.join(', ')} WHERE id = ?`;
        await dbQuery(sql2, filteredValues);
      } else {
        throw err;
      }
    }

    res.json({ success: true, message: '黑榜记录已更新' });
  } catch (error) {
    console.error('验证黑榜记录失败:', error);
    res.status(500).json({ success: false, error: '验证黑榜记录失败' });
  }
});

export default router;

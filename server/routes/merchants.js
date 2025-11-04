// 商家管理路由
import express from 'express';
import { getDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 模拟商家数据 - 生产环境中应该从数据库获取
const mockMerchants = [
  {
    id: 1,
    name: '体育用品专营店',
    category: 'gold',
    description: '专业体育用品销售，品质保证',
    contact: '13800138000',
    website: 'https://example.com',
    status: 'active',
    rating: 4.8,
    reviews: 156
  },
  {
    id: 2,
    name: '运动装备批发',
    category: 'advertiser',
    description: '批发各类运动装备，价格优惠',
    contact: '13900139000',
    website: 'https://example2.com',
    status: 'active',
    rating: 4.5,
    reviews: 89
  },
  {
    id: 3,
    name: '健身器材供应商',
    category: 'streamer',
    description: '专业健身器材，支持定制',
    contact: '13700137000',
    website: 'https://example3.com',
    status: 'active',
    rating: 4.9,
    reviews: 234
  }
];

// 获取所有商家（公开接口）
router.get('/', async (req, res) => {
  try {
    const merchants = await new Promise((resolve, reject) => {
      getDb().query(
        'SELECT id, name, description, category, contact_info, created_at FROM merchants ORDER BY created_at DESC',
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });
    
    res.json({
      success: true,
      data: merchants
    });
  } catch (error) {
    console.error('获取商家列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取商家列表失败'
    });
  }
});

// 管理员获取所有商家（包括非活跃状态）
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    res.json({
      success: true,
      data: mockMerchants
    });
  } catch (error) {
    console.error('管理员获取商家列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取商家列表失败'
    });
  }
});

// 管理员创建商家
router.post('/admin', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    const { name, category, description, contact, website } = req.body;
    
    // 简单的验证
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: '商家名称和类别是必填项'
      });
    }
    
    // 创建新商家（模拟）
    const newMerchant = {
      id: mockMerchants.length + 1,
      name,
      category,
      description: description || '',
      contact: contact || '',
      website: website || '',
      status: 'active',
      rating: 0,
      reviews: 0
    };
    
    mockMerchants.push(newMerchant);
    
    res.json({
      success: true,
      data: newMerchant,
      message: '商家创建成功'
    });
  } catch (error) {
    console.error('创建商家失败:', error);
    res.status(500).json({
      success: false,
      message: '创建商家失败'
    });
  }
});

// 管理员更新商家
router.put('/admin/:id', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    const { id } = req.params;
    const merchantId = parseInt(id);
    const merchantIndex = mockMerchants.findIndex(m => m.id === merchantId);
    
    if (merchantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '商家不存在'
      });
    }
    
    // 更新商家信息
    const updatedMerchant = {
      ...mockMerchants[merchantIndex],
      ...req.body
    };
    
    mockMerchants[merchantIndex] = updatedMerchant;
    
    res.json({
      success: true,
      data: updatedMerchant,
      message: '商家更新成功'
    });
  } catch (error) {
    console.error('更新商家失败:', error);
    res.status(500).json({
      success: false,
      message: '更新商家失败'
    });
  }
});

// 管理员删除商家
router.delete('/admin/:id', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    const { id } = req.params;
    const merchantId = parseInt(id);
    const merchantIndex = mockMerchants.findIndex(m => m.id === merchantId);
    
    if (merchantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '商家不存在'
      });
    }
    
    // 删除商家
    mockMerchants.splice(merchantIndex, 1);
    
    res.json({
      success: true,
      message: '商家删除成功'
    });
  } catch (error) {
    console.error('删除商家失败:', error);
    res.status(500).json({
      success: false,
      message: '删除商家失败'
    });
  }
});

// 管理员切换商家状态
router.patch('/admin/:id/status', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    const { id } = req.params;
    const { status } = req.body;
    const merchantId = parseInt(id);
    const merchantIndex = mockMerchants.findIndex(m => m.id === merchantId);
    
    if (merchantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '商家不存在'
      });
    }
    
    // 更新状态
    mockMerchants[merchantIndex].status = status;
    
    res.json({
      success: true,
      data: mockMerchants[merchantIndex],
      message: '商家状态更新成功'
    });
  } catch (error) {
    console.error('更新商家状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新商家状态失败'
    });
  }
});

export default router;

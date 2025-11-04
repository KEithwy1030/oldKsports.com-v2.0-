// server/routes/users.js
import express from 'express';
import { updateUserPoints, getUserAvatar, getUserInfo, updateUserProfile, getTodayOnlineUsers } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.patch('/me/points', authenticateToken, updateUserPoints);

// 更新用户资料
router.put('/me', authenticateToken, updateUserProfile);

// 获取今日在线用户（需要认证但不需要管理员权限）
router.get('/online/today', authenticateToken, getTodayOnlineUsers);

// 获取用户头像
router.get('/:username/avatar', getUserAvatar);

// 获取用户信息（包括积分）
router.get('/:username/info', getUserInfo);

export default router;

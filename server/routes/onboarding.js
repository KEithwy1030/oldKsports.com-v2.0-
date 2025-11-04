// server/routes/onboarding.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getOnboardingStatus,
  completeOnboardingTask,
  getNextTask,
  checkTaskCompletion
} from '../controllers/onboarding.controller.js';
import onboardingService from '../services/onboarding.service.js';

const router = express.Router();

// 获取新手引导状态
router.get('/status', authenticateToken, getOnboardingStatus);

// 完成新手任务
router.post('/complete-task', authenticateToken, completeOnboardingTask);

// 获取下一个任务
router.get('/next-task', authenticateToken, getNextTask);

// 检查任务完成状态
router.get('/check/:taskId', authenticateToken, checkTaskCompletion);

// 永久关闭新手引导
router.post('/dismiss', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await onboardingService.dismissOnboardingForever(userId);
    
    res.json({
      success: true,
      message: '新手引导已永久关闭'
    });
  } catch (error) {
    console.error('关闭新手引导失败:', error);
    res.status(500).json({
      success: false,
      error: '关闭新手引导失败'
    });
  }
});

// 更新新手引导显示时间
router.post('/update-show-time', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await onboardingService.updateOnboardingShowTime(userId);
    
    res.json({
      success: true,
      message: '显示时间已更新'
    });
  } catch (error) {
    console.error('更新显示时间失败:', error);
    res.status(500).json({
      success: false,
      error: '更新显示时间失败'
    });
  }
});

// 更新互动进度（用户回复帖子时调用）
router.post('/update-interaction', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await onboardingService.updateInteractionProgress(userId);
    
    res.json(result);
  } catch (error) {
    console.error('更新互动进度失败:', error);
    res.status(500).json({
      success: false,
      error: '更新互动进度失败'
    });
  }
});

export default router;

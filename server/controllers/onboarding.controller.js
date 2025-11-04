// server/controllers/onboarding.controller.js
import onboardingService from '../services/onboarding.service.js';

export const getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🎯 获取新手引导状态，用户ID:', userId);
    
    // 调用真实的onboarding service
    const onboardingStatus = await onboardingService.getUserOnboardingStatus(userId);
    
    console.log('🎯 返回新手引导状态:', onboardingStatus);
    
    res.json({
      success: true,
      data: onboardingStatus
    });
  } catch (error) {
    console.error('🎯 获取新手引导状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取新手引导状态失败'
    });
  }
};

export const completeOnboardingTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: '任务ID不能为空'
      });
    }

    const result = await onboardingService.completeOnboardingTask(userId, taskId);
    
    res.json(result);
  } catch (error) {
    console.error('完成新手任务失败:', error);
    res.status(500).json({
      success: false,
      error: '完成新手任务失败'
    });
  }
};

export const getNextTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const nextTask = await onboardingService.getNextTask(userId);
    
    res.json({
      success: true,
      data: nextTask
    });
  } catch (error) {
    console.error('获取下一个任务失败:', error);
    res.status(500).json({
      success: false,
      error: '获取下一个任务失败'
    });
  }
};

export const checkTaskCompletion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    
    const isCompleted = await onboardingService.checkTaskCompletion(userId, taskId);
    
    res.json({
      success: true,
      data: {
        taskId,
        completed: isCompleted
      }
    });
  } catch (error) {
    console.error('检查任务完成状态失败:', error);
    res.status(500).json({
      success: false,
      error: '检查任务完成状态失败'
    });
  }
};

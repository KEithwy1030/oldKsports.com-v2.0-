// server/services/onboarding.service.js
import { getDb } from '../db.js';
import { getUserLevel } from '../utils/userLevel.js';

class OnboardingService {
  // 初始化新用户任务记录
  async initNewUserTasks(userId) {
    try {
      console.log('🎯 初始化新用户任务记录，用户ID:', userId);
      
      const db = getDb();
      
      // 为新用户自动完成注册任务
      const completeRegistrationQuery = `
        INSERT IGNORE INTO onboarding_tasks (user_id, task_id, reward, completed_at) 
        VALUES (?, 'complete_registration', 20, NOW())
      `;
      
      await new Promise((resolve, reject) => {
        db.query(completeRegistrationQuery, [userId], (err, results) => {
          if (err) {
            console.error('初始化注册任务失败:', err);
            reject(err);
          } else {
            console.log('新用户注册任务已初始化');
            resolve(results);
          }
        });
      });
      
      console.log('🎯 新用户任务初始化完成');
      return true;
    } catch (error) {
      console.error('🎯 初始化新用户任务失败:', error);
      throw error;
    }
  }

  // 新手任务定义 - 根据个人中心积分获取方式排序
  static TASKS = [
    {
      id: 'complete_registration',
      name: '完成注册',
      description: '成功注册账户',
      reward: 20,
      required: true,
      order: 1,
      autoCompleted: true // 注册时自动完成
    },
    {
      id: 'upload_avatar',
      name: '上传头像',
      description: '设置您的个人头像',
      reward: 20,
      required: true,
      order: 2
    },
    {
      id: 'daily_checkin',
      name: '每日签到',
      description: '每日签到获得积分奖励',
      reward: 10,
      required: true,
      order: 3
    },
    {
      id: 'first_post',
      name: '发布帖子',
      description: '分享您的运动心得或经验',
      reward: 20,
      required: true,
      order: 4
    },
    {
      id: 'interact_community',
      name: '参与互动',
      description: '回复其他用户的帖子',
      reward: 30,
      required: true,
      order: 5,
      target: 5, // 需要完成5次
      type: 'repeatable' // 可重复完成的任务
    }
  ];

  // 获取用户新手引导状态
  async getUserOnboardingStatus(userId) {
    try {
      const db = getDb();
      
      // 检查用户信息和等级 - 使用简化的查询
      const userQuery = `
        SELECT id, username, points, created_at 
        FROM users 
        WHERE id = ?
      `;
      
      const userResult = await new Promise((resolve, reject) => {
        db.query(userQuery, [userId], (err, results) => {
          if (err) {
            console.error('用户查询失败:', err);
            reject(err);
          } else {
            resolve(results);
          }
        });
      });

      if (!userResult || userResult.length === 0) {
        throw new Error('用户不存在');
      }

      const user = userResult[0];
      
      // 使用用户等级工具函数
      const userLevel = getUserLevel(user.points || 0);
      
      // 只有"菜鸟新人"等级的用户才显示新手引导
      const isNewUser = userLevel.name === '菜鸟新人';
      
      if (!isNewUser) {
        return {
          isNewUser: false,
          completed: true,
          tasks: [],
          totalReward: 0,
          shouldShow: false
        };
      }

      // 只检查是否永久关闭，移除24小时冷却期限制
      const onboardingStatusQuery = `
        SELECT dismissed_forever 
        FROM onboarding_tasks 
        WHERE user_id = ? AND task_id = 'onboarding_status'
      `;
      
      const statusResult = await new Promise((resolve, reject) => {
        db.query(onboardingStatusQuery, [userId], (err, results) => {
          if (err) {
            console.error('查询新手引导状态失败:', err);
            reject(err);
          } else {
            resolve(results || []);
          }
        });
      });

      const onboardingStatus = statusResult[0];
      let shouldShow = true;

      // 只检查是否永久关闭
      console.log('🎯 检查onboarding_status记录:', onboardingStatus);
      if (onboardingStatus && onboardingStatus.dismissed_forever) {
        console.log('🎯 用户已永久关闭新手引导');
        shouldShow = false;
      } else {
        console.log('🎯 用户未永久关闭新手引导，shouldShow保持为true');
      }

      // 获取用户已完成的任务
      let completedTasks = [];
      
      try {
        // 查询已完成的任务，包括进度信息
        const taskQuery = 'SELECT task_id, progress, target, completed_at FROM onboarding_tasks WHERE user_id = ?';
        completedTasks = await new Promise((resolve, reject) => {
          db.query(taskQuery, [userId], (err, results) => {
            if (err) {
              console.error('查询已完成任务失败:', err);
              reject(err);
            } else {
              resolve(results || []);
            }
          });
        });
      } catch (error) {
        console.error('处理onboarding_tasks表时出错:', error);
        // 如果出错，使用空数组继续执行
        completedTasks = [];
      }

      const completedTaskIds = completedTasks.map(task => task.task_id);
      
      // 构建任务状态
      const tasks = OnboardingService.TASKS.map(task => {
        const completedTask = completedTasks.find(ct => ct.task_id === task.id);
        
        // 处理不同类型的任务
        if (task.type === 'repeatable' && task.target) {
          // 可重复任务：检查进度是否达到目标
          const progress = completedTask?.progress || 0;
          const target = task.target;
          const isCompleted = progress >= target;
          
          return {
            ...task,
            completed: isCompleted,
            progress: progress,
            target: target,
            completedAt: isCompleted ? completedTask?.completed_at : null
          };
        } else {
          // 普通任务：检查是否已完成
          const isCompleted = task.id === 'complete_registration' || completedTaskIds.includes(task.id);
          
          return {
            ...task,
            completed: isCompleted,
            progress: isCompleted ? 1 : 0,
            target: 1,
            completedAt: task.id === 'complete_registration' 
              ? user.created_at 
              : completedTask?.completed_at
          };
        }
      });

      const completedCount = tasks.filter(task => task.completed).length;
      const totalReward = tasks.filter(task => task.completed).reduce((sum, task) => sum + task.reward, 0);
      
      // 检查是否有未完成任务
      const hasIncompleteTasks = tasks.some(task => !task.completed);
      
      // 最终判断是否应该显示新手引导
      const finalShouldShow = shouldShow && hasIncompleteTasks;
      
      console.log('🎯 新手引导显示判断详情:', {
        userId,
        isNewUser: true,
        shouldShow,
        hasIncompleteTasks,
        finalShouldShow,
        completedCount,
        totalTasks: OnboardingService.TASKS.length
      });

      return {
        isNewUser: true,
        completed: completedCount === OnboardingService.TASKS.length,
        tasks,
        completedCount,
        totalReward,
        progress: Math.round((completedCount / OnboardingService.TASKS.length) * 100),
        shouldShow: finalShouldShow,
        hasIncompleteTasks
      };
    } catch (error) {
      console.error('获取新手引导状态失败:', error);
      throw error;
    }
  }

  // 更新新手引导显示时间（不再需要，保留方法兼容性）
  async updateOnboardingShowTime(userId) {
    try {
      // 不再记录显示时间，每次登录都会检查
      console.log('🎯 新手引导显示时间更新（已禁用）');
      return true;
    } catch (error) {
      console.error('🎯 更新新手引导显示时间失败:', error);
      throw error;
    }
  }

  // 永久关闭新手引导
  async dismissOnboardingForever(userId) {
    try {
      const db = getDb();
      
      const dismissQuery = `
        INSERT INTO onboarding_tasks (user_id, task_id, dismissed_forever, created_at) 
        VALUES (?, 'onboarding_status', TRUE, NOW())
        ON DUPLICATE KEY UPDATE dismissed_forever = TRUE
      `;
      
      await new Promise((resolve, reject) => {
        db.query(dismissQuery, [userId], (err, results) => {
          if (err) {
            console.error('永久关闭新手引导失败:', err);
            reject(err);
          } else {
            console.log('🎯 新手引导已永久关闭');
            resolve(results);
          }
        });
      });
      
      return true;
    } catch (error) {
      console.error('🎯 永久关闭新手引导失败:', error);
      throw error;
    }
  }

  // 完成新手任务
  async completeOnboardingTask(userId, taskId) {
    try {
      // 验证任务是否存在
      const task = OnboardingService.TASKS.find(t => t.id === taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      const db = getDb();
      
      // 检查任务当前状态
      const existingTask = await new Promise((resolve, reject) => {
        db.query('SELECT * FROM onboarding_tasks WHERE user_id = ? AND task_id = ?', [userId, taskId], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results || []);
          }
        });
      });

      if (task.type === 'repeatable' && task.target) {
        // 可重复任务：更新进度
        const currentProgress = existingTask.length > 0 ? (existingTask[0].progress || 0) : 0;
        const newProgress = currentProgress + 1;
        const isCompleted = newProgress >= task.target;
        
        if (existingTask.length > 0) {
          // 更新现有记录
          await new Promise((resolve, reject) => {
            db.query('UPDATE onboarding_tasks SET progress = ?, completed_at = ? WHERE user_id = ? AND task_id = ?', 
              [newProgress, isCompleted ? new Date() : null, userId, taskId], (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results);
              }
            });
          });
        } else {
          // 创建新记录
          await new Promise((resolve, reject) => {
            db.query('INSERT INTO onboarding_tasks (user_id, task_id, reward, progress, target, completed_at) VALUES (?, ?, ?, ?, ?, ?)', 
              [userId, taskId, task.reward, newProgress, task.target, isCompleted ? new Date() : null], (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results);
              }
            });
          });
        }
        
        // 只在任务完成时奖励积分
        if (isCompleted) {
          await new Promise((resolve, reject) => {
            db.query('UPDATE users SET points = points + ? WHERE id = ?', [task.reward, userId], (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results);
              }
            });
          });
        }
        
        return {
          success: true,
          message: isCompleted ? '任务已完成' : `任务进度更新：${newProgress}/${task.target}`,
          completed: isCompleted,
          progress: newProgress,
          target: task.target
        };
      } else {
        // 普通任务：检查是否已完成
        if (existingTask.length > 0) {
          return {
            success: false,
            message: '任务已完成'
          };
        }

        // 记录任务完成
        await new Promise((resolve, reject) => {
          db.query('INSERT INTO onboarding_tasks (user_id, task_id, reward, progress, target, completed_at) VALUES (?, ?, ?, 1, 1, NOW())', 
            [userId, taskId, task.reward], (err, results) => {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        });

        // 奖励积分
        await new Promise((resolve, reject) => {
          db.query('UPDATE users SET points = points + ? WHERE id = ?', [task.reward, userId], (err, results) => {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        });

        return {
          success: true,
          message: '任务已完成',
          completed: true,
          progress: 1,
          target: 1
        };
      }

      // 获取更新后的状态
      const status = await this.getUserOnboardingStatus(userId);

      return {
        success: true,
        message: `任务完成！获得${task.reward}积分奖励`,
        reward: task.reward,
        status
      };
    } catch (error) {
      console.error('完成新手任务失败:', error);
      throw error;
    }
  }

  // 获取下一个未完成任务
  async getNextTask(userId) {
    try {
      const status = await this.getUserOnboardingStatus(userId);
      
      if (!status.isNewUser || status.completed) {
        return null;
      }

      const nextTask = status.tasks.find(task => !task.completed);
      return nextTask;
    } catch (error) {
      console.error('获取下一个任务失败:', error);
      throw error;
    }
  }

  // 检查特定任务完成条件
  async checkTaskCompletion(userId, taskId) {
    try {
      switch (taskId) {
        case 'complete_profile':
          const profileData = await new Promise((resolve, reject) => {
            getDb().query('SELECT username, bio FROM users WHERE id = ?', [userId], (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results || []);
              }
            });
          });
          const hasProfile = profileData[0]?.bio && profileData[0].bio.trim().length > 0;
          return hasProfile;

        case 'upload_avatar':
          const avatarData = await new Promise((resolve, reject) => {
            getDb().query('SELECT has_uploaded_avatar FROM users WHERE id = ?', [userId], (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results || []);
              }
            });
          });
          return avatarData[0]?.has_uploaded_avatar || false;

        case 'first_post':
          const postData = await new Promise((resolve, reject) => {
            getDb().query('SELECT COUNT(*) as count FROM forum_posts WHERE user_id = ?', [userId], (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results || []);
              }
            });
          });
          return postData[0]?.count > 0;

        case 'interact_community':
          const replyData = await new Promise((resolve, reject) => {
            getDb().query('SELECT COUNT(*) as count FROM forum_replies WHERE user_id = ?', [userId], (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results || []);
              }
            });
          });
          return replyData[0]?.count > 0;

        case 'daily_checkin':
          // 检查今日是否已签到
          const checkinData = await new Promise((resolve, reject) => {
            getDb().query('SELECT last_checkin_date FROM users WHERE id = ?', [userId], (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results || []);
              }
            });
          });
          const lastCheckinDate = checkinData[0]?.last_checkin_date;
          if (!lastCheckinDate) return false;
          
          const today = new Date().toISOString().split('T')[0];
          const lastCheckin = new Date(lastCheckinDate).toISOString().split('T')[0];
          return lastCheckin === today;

        default:
          return false;
      }
    } catch (error) {
      console.error('检查任务完成条件失败:', error);
      return false;
    }
  }

  // 更新用户互动进度（在用户回复帖子时调用）
  async updateInteractionProgress(userId) {
    try {
      const task = OnboardingService.TASKS.find(t => t.id === 'interact_community');
      if (!task || task.type !== 'repeatable') {
        return { success: false, message: '任务不存在或不是可重复任务' };
      }

      const result = await this.completeOnboardingTask(userId, 'interact_community');
      return result;
    } catch (error) {
      console.error('更新互动进度失败:', error);
      throw error;
    }
  }
}

export default new OnboardingService();

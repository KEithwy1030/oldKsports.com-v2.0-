import React, { useState, useEffect } from 'react';
import { CheckCircle, Star, Gift, ArrowRight, X, Trophy, User, Image, MessageSquare, CalendarDays, FileText, Award } from 'lucide-react';
import { USER_LEVELS } from '../data/constants';
import { UserLevel } from '../types';

interface OnboardingTask {
  id: string;
  name: string;
  description: string;
  reward: number;
  completed: boolean;
  order: number;
  progress?: number; // 新增进度字段，用于多次完成的任务
  target?: number; // 新增目标字段，用于多次完成的任务
}

interface OnboardingStatus {
  isNewUser: boolean;
  completed: boolean;
  tasks: OnboardingTask[];
  completedCount: number;
  totalReward: number;
  progress: number;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: OnboardingStatus;
  onCompleteTask: (taskId: string) => Promise<void>;
  onNavigateToProfile: () => void;
  onNavigateToNewPost: () => void;
  onNavigateToForum: () => void;
  onDismissForever?: () => void;
  currentUserLevel?: UserLevel; // 当前用户等级
  suppressOnboardingFor?: (minutes: number) => void; // 设置抑制期
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  status,
  onCompleteTask,
  onNavigateToProfile,
  onNavigateToNewPost,
  onNavigateToForum,
  onDismissForever,
  currentUserLevel,
  suppressOnboardingFor
}) => {
  const [currentTask, setCurrentTask] = useState<OnboardingTask | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (status.tasks.length > 0) {
      const nextTask = status.tasks.find(task => !task.completed);
      setCurrentTask(nextTask || null);
    }
  }, [status.tasks]);

  const handleTaskAction = async (taskId: string) => {
    setIsCompleting(true);
    try {
      await onCompleteTask(taskId);
    } catch (error) {
      console.error('完成任务失败:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNavigateToTask = (taskId: string) => {
    // 根据不同任务设置不同的抑制时间
    const getSuppressMinutes = (taskId: string) => {
      switch (taskId) {
        case 'upload_avatar':
          return 5; // 上传头像：5分钟
        case 'daily_checkin':
          return 3; // 每日签到：3分钟
        case 'first_post':
          return 10; // 发布帖子：10分钟
        case 'interact_community':
          return 8; // 参与互动：8分钟
        default:
          return 5; // 默认5分钟
      }
    };

    // 设置抑制期
    if (suppressOnboardingFor) {
      const minutes = getSuppressMinutes(taskId);
      suppressOnboardingFor(minutes);
    }

    switch (taskId) {
      case 'complete_registration':
        // 注册任务已完成，不需要导航
        return;
      case 'upload_avatar':
        onNavigateToProfile();
        break;
      case 'first_post':
        onNavigateToNewPost();
        break;
      case 'interact_community':
        onNavigateToForum();
        break;
      case 'daily_checkin':
        onNavigateToProfile();
        break;
      default:
        break;
    }
  };

  const getTaskIcon = (taskId: string) => {
    const iconClass = "w-6 h-6";
    switch (taskId) {
      case 'complete_registration':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'upload_avatar':
        return <User className={`${iconClass} text-blue-500`} />;
      case 'first_post':
        return <FileText className={`${iconClass} text-purple-500`} />;
      case 'interact_community':
        return <MessageSquare className={`${iconClass} text-orange-500`} />;
      case 'daily_checkin':
        return <CalendarDays className={`${iconClass} text-red-500`} />;
      default:
        return <Award className={`${iconClass} text-amber-500`} />;
    }
  };

  const getButtonText = (taskId: string, completed: boolean) => {
    if (completed) return '已完成';
    switch (taskId) {
      case 'complete_registration':
        return '去完成';
      case 'upload_avatar':
        return '去上传';
      case 'daily_checkin':
        return '去签到';
      case 'first_post':
        return '去发帖';
      case 'interact_community':
        return '去互动';
      default:
        return '去完成';
    }
  };

  const getTaskDisplayText = (task: OnboardingTask) => {
    if (task.id === 'interact_community' && task.progress !== undefined && task.target !== undefined) {
      return `参与互动${task.target}次（已完成${task.progress}次）`;
    }
    return task.name;
  };

  if (!isOpen || !status.isNewUser) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 dark:bg-black/70 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 border border-gray-200 dark:border-slate-600 max-h-[85vh] overflow-y-auto">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <Award className="w-7 h-7 text-amber-400 mr-3" />
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* 简化的标题和等级显示 */}
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              🎉 恭喜你，完成注册啦！快完成新手任务升级吧！
            </h2>
            
            {/* 简化的等级显示 */}
            <div className="flex gap-2 flex-wrap items-center">
              {USER_LEVELS.map((level) => {
                const isCurrentLevel = currentUserLevel?.id === level.id;
                
                return (
                  <div
                    key={level.id}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                      isCurrentLevel 
                        ? 'border-2 shadow-lg scale-105' 
                        : 'border border-opacity-20 opacity-60'
                    }`}
                    style={{
                      backgroundColor: isCurrentLevel ? `${level.color}30` : `${level.color}15`,
                      color: level.color,
                      borderColor: isCurrentLevel ? level.color : `${level.color}40`
                    }}
                  >
                    {isCurrentLevel && <Star className="w-3 h-3 inline mr-1" />}
                    {level.name}
                    {isCurrentLevel && <span className="ml-1">(当前)</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 简化的进度条 */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-900 dark:text-white font-medium text-sm">完成进度</span>
            <span className="text-amber-500 dark:text-amber-400 font-bold text-sm">{status.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-2 text-center">
            已完成 {status.completedCount}/{status.tasks.length} 个任务
          </div>
        </div>

        {/* 简化的任务列表 */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">任务列表</h3>
          
          <div className="space-y-2">
            {status.tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                  task.completed
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-500/30'
                    : 'bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer'
                }`}
                onClick={() => !task.completed && handleNavigateToTask(task.id)}
              >
                <div className="flex items-center flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 mr-3">
                    {getTaskIcon(task.id)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium ${
                        task.completed ? 'text-emerald-600 dark:text-emerald-300 line-through' : 'text-gray-900 dark:text-white'
                      }`}>
                        {getTaskDisplayText(task)}
                      </h4>
                      {task.completed && (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-amber-400 text-sm font-medium">+{task.reward}</span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!task.completed) {
                        handleNavigateToTask(task.id);
                      }
                    }}
                    disabled={task.completed || isCompleting}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                      task.completed
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${isCompleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {getButtonText(task.id, task.completed)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* 完成提示 */}
        {status.completed && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/30">
            <div className="text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-300 mb-2">恭喜完成所有任务！</h3>
              <p className="text-emerald-700 dark:text-emerald-200 text-sm mb-3">
                您已成功完成新手引导，获得了 {status.totalReward} 积分奖励！
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
              >
                开始探索社区
              </button>
            </div>
          </div>
        )}

        {/* 简化的底部按钮 */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex justify-end gap-2">
            {onDismissForever && (
              <button
                onClick={onDismissForever}
                className="px-3 py-2 rounded-lg text-gray-600 dark:text-slate-400 font-medium text-xs
                           bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors duration-200
                           border border-gray-300 dark:border-slate-600"
              >
                不再提醒
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm
                         bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              稍后完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;

// client/src/context/OnboardingContext.tsx
// 新手引导功能独立Context

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '../utils/api';
import { debugLog } from '../utils/debug';

interface OnboardingContextType {
  onboardingStatus: any;
  showOnboardingModal: boolean;
  setShowOnboardingModal: (show: boolean) => void;
  checkOnboardingStatus: () => Promise<void>;
  completeOnboardingTask: (taskId: string) => Promise<void>;
  dismissOnboardingForever: () => void;
  suppressOnboardingFor: (minutes: number) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // 监听用户登录状态变化 - 只在登录/注册时检查
  useEffect(() => {
    const checkUserAndShowOnboarding = async () => {
      const token = localStorage.getItem('oldksports_auth_token');
      const userData = localStorage.getItem('oldksports_user');
      
      if (token && userData && token !== 'null' && token.length > 50) {
        try {
          const user = JSON.parse(userData);
          debugLog('🎯 OnboardingContext: 检测到用户登录，用户ID:', user.id);
          
          // 每次登录都检查新手引导状态（移除localStorage限制）
          debugLog('🎯 检查新手引导状态');
          // 延迟检查新手引导状态，确保页面加载完成
          setTimeout(async () => {
            debugLog('🎯 开始执行checkOnboardingStatus');
            await checkOnboardingStatus();
            debugLog('🎯 checkOnboardingStatus执行完成');
          }, 500);
        } catch (error) {
          console.error('🎯 OnboardingContext: 解析用户数据失败:', error);
        }
      }
    };

    // 立即检查一次（处理页面刷新或直接设置localStorage的情况）
    checkUserAndShowOnboarding();

    // 监听localStorage变化（用户登录/登出）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'oldksports_user' || e.key === 'oldksports_auth_token') {
        debugLog('🎯 OnboardingContext: 检测到localStorage变化，重新检查新手引导');
        checkUserAndShowOnboarding();
      }
    };

    // 监听自定义事件（AuthContext登录成功时触发）
    const handleAuthSuccess = () => {
      debugLog('🎯 OnboardingContext: 收到登录成功事件，检查新手引导');
      setTimeout(() => {
        checkUserAndShowOnboarding();
      }, 1000); // 延迟1秒确保AuthContext完成所有设置
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-success', handleAuthSuccess);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-success', handleAuthSuccess);
    };
  }, []);

  // 检查新手引导状态
  const checkOnboardingStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('oldksports_auth_token');
      if (!token || token === 'null' || token.length < 50) {
        debugLog('🎯 没有有效的token，跳过新手引导检查');
        return;
      }

      const userData = localStorage.getItem('oldksports_user');
      if (!userData) {
        debugLog('🎯 没有用户数据，跳过新手引导检查');
        return;
      }

      const user = JSON.parse(userData);
      debugLog('🎯 检查用户新手引导状态，用户ID:', user.id, '用户名:', user.username);

      // 检查是否为重新登录（无视抑制期）
      const isRelogin = localStorage.getItem('onboarding_relogin_flag');
      if (isRelogin) {
        debugLog('🎯 检测到重新登录，无视抑制期，直接检查新手引导');
        localStorage.removeItem('onboarding_relogin_flag'); // 清除重新登录标志
      } else {
        // 检查是否在抑制期内（仅在非重新登录时）
        const suppressUntil = sessionStorage.getItem('onboarding_suppress_until');
        if (suppressUntil) {
          const suppressTime = parseInt(suppressUntil);
          const currentTime = Date.now();
          
          if (currentTime < suppressTime) {
            const remainingMinutes = Math.ceil((suppressTime - currentTime) / (1000 * 60));
            debugLog(`🎯 新手引导在抑制期内，剩余 ${remainingMinutes} 分钟`);
            return;
          } else {
            // 抑制期已过，清除抑制标志
            sessionStorage.removeItem('onboarding_suppress_until');
            debugLog('🎯 新手引导抑制期已过，清除抑制标志');
          }
        }
      }

      const response = await authAPI.getOnboardingStatus();
      debugLog('🎯 API响应:', response);
      
      // API响应结构: {success: true, data: {...}}
      if (response && response.data) {
        const onboardingData = response.data;
        debugLog('🎯 设置onboardingStatus:', onboardingData);
        setOnboardingStatus(onboardingData);
        
        // 根据后端返回的shouldShow状态决定是否显示
        if (onboardingData.shouldShow) {
          debugLog('🎯 后端判断应该显示新手引导弹窗');
          debugLog('🎯 设置showOnboardingModal为true');
          setShowOnboardingModal(true);
          
          // 通知后端更新显示时间
          try {
            await authAPI.updateOnboardingShowTime();
            debugLog('🎯 新手引导显示时间已更新');
          } catch (error) {
            console.error('🎯 更新显示时间失败:', error);
          }
        } else {
          debugLog('🎯 后端判断不需要显示新手引导:', {
            isNewUser: onboardingData.isNewUser,
            shouldShow: onboardingData.shouldShow,
            hasIncompleteTasks: onboardingData.hasIncompleteTasks
          });
        }
      } else {
        debugLog('🎯 API响应中没有data字段');
      }
    } catch (error) {
      console.error('🎯 获取新手引导状态失败:', error);
    }
  }, []);

  // 完成新手引导任务
  const completeOnboardingTask = useCallback(async (taskId: string) => {
    try {
      await authAPI.completeOnboardingTask(taskId);
      
      // 更新本地状态
      setOnboardingStatus((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks?.map((task: any) => 
            task.id === taskId ? { ...task, completed: true } : task
          )
        };
      });
    } catch (error) {
      console.error('完成新手引导任务失败:', error);
    }
  }, []);

  // 永久关闭新手引导
  const dismissOnboardingForever = useCallback(() => {
    try {
      authAPI.dismissOnboarding();
      setOnboardingStatus((prev: any) => prev ? { ...prev, dismissed: true } : null);
      setShowOnboardingModal(false);
    } catch (error) {
      console.error('关闭新手引导失败:', error);
    }
  }, []);

  // 设置新手引导抑制期
  const suppressOnboardingFor = useCallback((minutes: number) => {
    const suppressTime = Date.now() + (minutes * 60 * 1000);
    sessionStorage.setItem('onboarding_suppress_until', suppressTime.toString());
    debugLog(`🎯 设置新手引导抑制期：${minutes}分钟`);
  }, []);

  const value: OnboardingContextType = {
    onboardingStatus,
    showOnboardingModal,
    setShowOnboardingModal,
    checkOnboardingStatus,
    completeOnboardingTask,
    dismissOnboardingForever,
    suppressOnboardingFor,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};


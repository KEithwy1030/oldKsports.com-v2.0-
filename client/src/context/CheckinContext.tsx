// client/src/context/CheckinContext.tsx
// 签到提醒功能独立Context

import React, { createContext, useContext, useState, useCallback } from 'react';
import { userAPI } from '../utils/api';

interface CheckinContextType {
  showCheckinReminder: boolean;
  checkinReminderData: { consecutiveCheckins: number } | null;
  setShowCheckinReminder: (show: boolean) => void;
  checkCheckinStatus: () => Promise<void>;
  checkCheckinStatusDirect: (userId: number) => Promise<void>;
  checkAndShowCheckinReminder: (userId: number) => Promise<void>;
}

const CheckinContext = createContext<CheckinContextType | undefined>(undefined);

export const useCheckin = () => {
  const context = useContext(CheckinContext);
  if (context === undefined) {
    throw new Error('useCheckin must be used within a CheckinProvider');
  }
  return context;
};

export const CheckinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showCheckinReminder, setShowCheckinReminder] = useState(false);
  const [checkinReminderData, setCheckinReminderData] = useState<{ consecutiveCheckins: number } | null>(null);

  // 检查签到状态
  const checkCheckinStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('oldksports_auth_token');
      const savedUser = localStorage.getItem('oldksports_user');
      
      if (!token || !savedUser) {
        return;
      }

      const userData = JSON.parse(savedUser);
      await checkCheckinStatusDirect(userData.id);
    } catch (error) {
      console.error('检查签到状态失败:', error);
    }
  }, []);

  // 直接检查用户签到状态
  const checkCheckinStatusDirect = useCallback(async (userId: number) => {
    try {
      const response = await userAPI.checkCheckinStatus(userId);
      
      if (response.data && response.data.shouldRemind) {
        setCheckinReminderData({
          consecutiveCheckins: response.data.consecutiveCheckins || 0
        });
        setShowCheckinReminder(true);
      }
    } catch (error) {
      console.error('检查签到状态失败:', error);
    }
  }, []);

  // 检查并显示签到提醒
  const checkAndShowCheckinReminder = useCallback(async (userId: number) => {
    await checkCheckinStatusDirect(userId);
  }, [checkCheckinStatusDirect]);

  const value: CheckinContextType = {
    showCheckinReminder,
    checkinReminderData,
    setShowCheckinReminder,
    checkCheckinStatus,
    checkCheckinStatusDirect,
    checkAndShowCheckinReminder,
  };

  return (
    <CheckinContext.Provider value={value}>
      {children}
    </CheckinContext.Provider>
  );
};


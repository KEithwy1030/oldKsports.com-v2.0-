import React, { useState, useEffect } from 'react';
import { userAPI } from '../utils/api';
import { checkUsernameBeforeApiCall } from '../utils/userIdValidator';
import { getUserLevel } from '../utils/userUtils';
import { UserLevel } from '../types';
import { debugLog } from '../utils/debug';

interface UserLevelProps {
  username: string;
  className?: string;
}

const UserLevelComponent: React.FC<UserLevelProps> = ({ username, className = '' }) => {
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchUserLevel = async () => {
      debugLog('🏆 UserLevel fetchUserLevel被调用:', {
        username,
        usernameType: typeof username,
        usernameLength: username ? username.length : 0
      });
      
      // 根据Agent建议：在API调用前检查用户名
      if (!checkUsernameBeforeApiCall(username, 'UserLevel')) {
        setError(true);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(false);
      try {
        debugLog(`Fetching user info for: ${username}`);
        const response = await userAPI.getUserInfo(username);
        debugLog(`User info response for ${username}:`, response);
        if (response.success) {
          const level = getUserLevel(response.user.points);
          debugLog(`Calculated level for ${username} (${response.user.points} points):`, level);
          setUserLevel(level);
        } else {
          console.warn('🏆 UserLevel: 获取用户信息失败，使用默认等级');
          setError(true);
        }
      } catch (err) {
        console.error('🏆 UserLevel: 获取用户等级异常:', username, err);
        setError(true);
        // 不抛出错误，避免页面崩溃
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserLevel();
  }, [username]);

  if (isLoading) {
    return (
      <span className={`inline-flex items-center whitespace-nowrap leading-none px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-gray-600/20 text-gray-400 border border-gray-500/20 ${className}`}>
        加载中...
      </span>
    );
  }

  if (error || !userLevel) {
    return (
      <span className={`inline-flex items-center whitespace-nowrap leading-none px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-gray-600/20 text-gray-400 border border-gray-500/20 ${className}`}>
        未知等级
      </span>
    );
  }

  return (
    <span 
      className={`inline-flex items-center whitespace-nowrap leading-none px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium border shadow-sm ${className}`}
      style={{ 
        backgroundColor: `${userLevel.color}20`,
        borderColor: `${userLevel.color}40`,
        color: userLevel.color
      }}
    >
      {userLevel.name}
    </span>
  );
};

export default UserLevelComponent;

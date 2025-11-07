// 安全的用户数据Hook - 防止undefined错误
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { debugLog } from '../utils/debug';

export const useSafeUser = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [safeUser, setSafeUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    debugLog('useSafeUser检查:', {
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      username: user?.username
    });

    // 如果正在加载，等待
    if (isLoading) {
      setIsReady(false);
      return;
    }

    // 如果用户数据不完整，返回null
    if (!isAuthenticated || !user || !user.id || !user.username) {
      console.warn('useSafeUser: 用户数据不完整，返回null');
      setSafeUser(null);
      setIsReady(true);
      return;
    }

    // 用户数据完整，设置安全用户
    debugLog('useSafeUser: 用户数据完整，设置安全用户');
    setSafeUser(user);
    setIsReady(true);
  }, [user, isLoading, isAuthenticated]);

  return {
    user: safeUser,
    isLoading: !isReady,
    isAuthenticated: isAuthenticated && !!safeUser,
    isReady
  };
};

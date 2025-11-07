// 强制清理工具 - 解决undefined错误
import { debugLog } from './debug';

export const forceCleanup = () => {
  debugLog('🧹 开始强制清理...');
  
  try {
    // 清理localStorage
    localStorage.removeItem('oldksports_auth_token');
    localStorage.removeItem('oldksports_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // 清理sessionStorage
    sessionStorage.clear();
    
    // 清理cookies
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'oldksports_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    debugLog('🧹 强制清理完成');
    return true;
  } catch (error) {
    console.error('🧹 强制清理失败:', error);
    return false;
  }
};

// 检查用户数据完整性
export const validateUserData = (user: any): boolean => {
  if (!user) {
    console.warn('🔍 用户数据为空');
    return false;
  }
  
  if (!user.id || !user.username) {
    console.warn('🔍 用户数据不完整:', {
      hasId: !!user.id,
      hasUsername: !!user.username,
      user: user
    });
    return false;
  }
  
  if (user.username === 'undefined' || user.username === 'null') {
    console.warn('🔍 用户名无效:', user.username);
    return false;
  }
  
  debugLog('🔍 用户数据验证通过');
  return true;
};

// 安全获取用户名
export const getSafeUsername = (user: any): string | null => {
  if (!user || !user.username) {
    return null;
  }
  
  if (user.username === 'undefined' || user.username === 'null' || user.username === '') {
    return null;
  }
  
  return user.username;
};

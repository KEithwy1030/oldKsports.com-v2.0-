// 令牌同步工具 - 确保前端令牌存储一致性
import { debugLog } from './debug';

export const tokenSync = {
  // 获取有效的令牌（优先使用新的存储位置）
  getValidToken: (): string | null => {
    // 优先使用新的存储位置
    let token = localStorage.getItem('oldksports_auth_token');
    
    // 如果新位置没有，尝试旧位置
    if (!token) {
      token = localStorage.getItem('access_token');
      // 如果找到旧令牌，同步到新位置
      if (token) {
        localStorage.setItem('oldksports_auth_token', token);
        debugLog('令牌同步: 从旧位置迁移到新位置');
      }
    }
    
    return token;
  },

  // 存储令牌到所有位置（确保兼容性）
  setToken: (token: string): void => {
    localStorage.setItem('oldksports_auth_token', token); // 新位置
    localStorage.setItem('access_token', token); // 旧位置（兼容性）
    debugLog('令牌存储: 已同步到所有位置');
  },

  // 清理所有令牌
  clearAllTokens: (): void => {
    localStorage.removeItem('oldksports_auth_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('oldksports_user');
    localStorage.removeItem('user');
    
    // 清理cookies
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    debugLog('令牌清理: 已清理所有位置的令牌');
  },

  // 验证令牌是否有效
  validateToken: async (token: string): Promise<boolean> => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/admin/check`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      const isValid = response.ok;
      debugLog('令牌验证:', { isValid, status: response.status });
      return isValid;
    } catch (error) {
      console.error('令牌验证失败:', error);
      return false;
    }
  }
};

// 页面加载时自动同步令牌
export const initTokenSync = (): void => {
  const token = tokenSync.getValidToken();
  if (token) {
    debugLog('令牌同步初始化: 找到有效令牌');
    tokenSync.setToken(token); // 确保存储在所有位置
  } else {
    debugLog('令牌同步初始化: 未找到有效令牌');
  }
};

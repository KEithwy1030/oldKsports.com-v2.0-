// 紧急防护组件 - 防止undefined错误
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { debugLog } from '../utils/debug';

interface EmergencyGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const EmergencyGuard: React.FC<EmergencyGuardProps> = ({ 
  children, 
  fallback = <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
      <p>正在加载用户数据...</p>
    </div>
  </div>
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  debugLog('🚨 EmergencyGuard检查:', {
    isLoading,
    isAuthenticated,
    hasUser: !!user,
    userId: user?.id,
    username: user?.username,
    userType: typeof user,
    userKeys: user ? Object.keys(user) : 'null'
  });
  
  // 如果正在加载，显示加载状态
  if (isLoading) {
    debugLog('EmergencyGuard: 正在加载中...');
    return <>{fallback}</>;
  }
  
  // 只有在真正异常时才显示错误状态（更宽松的检查）
  if (!isLoading && isAuthenticated && (!user || !user.id || !user.username)) {
    console.warn('EmergencyGuard: 用户数据不完整，显示错误状态', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      username: user?.username
    });
    
    // 只在确认数据损坏时才清理localStorage
    try {
      localStorage.removeItem('oldksports_auth_token');
      localStorage.removeItem('oldksports_user');
      localStorage.removeItem('access_token');
      debugLog('EmergencyGuard: 已清理损坏的localStorage数据');
    } catch (error) {
      console.error('EmergencyGuard: 清理localStorage失败:', error);
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ 用户数据异常</div>
          <p className="mb-4">请重新登录</p>
          <button 
            onClick={() => {
              // 强制清理所有数据并重新加载
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/login';
            }} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重新登录
          </button>
        </div>
      </div>
    );
  }
  
  debugLog('EmergencyGuard: 用户数据正常，允许渲染');
  return <>{children}</>;
};

export default EmergencyGuard;

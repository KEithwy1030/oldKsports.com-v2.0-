import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { debugLog } from '../utils/debug';

/**
 * 用户等级同步组件
 * 在应用启动时重新计算用户等级，确保与最新的等级积分要求同步
 */
const UserLevelSync: React.FC = () => {
  const { user, recalculateUserLevel } = useAuth();
  const hasRecalculated = useRef(false);

  useEffect(() => {
    // 只在用户登录且尚未重新计算时执行一次
    if (user && !hasRecalculated.current) {
      debugLog('UserLevelSync: Recalculating user level for', user.username);
      recalculateUserLevel();
      hasRecalculated.current = true;
    }
  }, [user, recalculateUserLevel]);

  // 这个组件不渲染任何内容
  return null;
};

export default UserLevelSync;

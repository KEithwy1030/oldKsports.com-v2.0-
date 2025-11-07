import React, { useState, useEffect } from 'react';
import { Calendar, Briefcase } from 'lucide-react';
import { User } from '../types';
import UserLevelBadge from './UserLevelBadge';
import { INDUSTRY_ROLES } from '../data/constants';
import { useAuth } from '../context/AuthContext';
import { debugLog } from '../utils/debug';

interface SimpleUserProfileCardProps {
  userId?: string;
  user?: User;
  className?: string;
}

const SimpleUserProfileCard: React.FC<SimpleUserProfileCardProps> = ({ 
  userId, 
  user: propUser, 
  className = '' 
}) => {
  const { user: contextUser } = useAuth();
  
  // 使用单一数据源：优先使用传入的用户，如果没有则使用上下文用户
  const user = propUser || (userId ? contextUser : contextUser);
  
  // 监听用户状态变化，确保头像实时更新
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  
  useEffect(() => {
    if (user && user.id === contextUser?.id) {
      // 如果是当前用户，监听上下文变化
      setCurrentUser(contextUser);
    } else if (user) {
      // 如果是其他用户，直接使用传入的用户
      setCurrentUser(user);
    }
  }, [user, contextUser, user?.id]);
  
  if (!currentUser) return null;
  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.username}
              className="w-full h-full rounded-full object-cover"
              key={currentUser.avatar + (currentUser.id || '')}
              onError={(e) => {
                console.error('Avatar image failed to load:', e);
                debugLog('Avatar URL:', currentUser.avatar);
              }}
              onLoad={() => {
                debugLog('Avatar image loaded成功');
              }}
            />
          ) : (
            <span className="text-xl font-bold text-emerald-400">
              {currentUser.username.charAt(0)}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-white truncate">{currentUser.username}</h3>
            <UserLevelBadge level={currentUser.level} />
          </div>
          
          {/* User Roles */}
          {currentUser.roles && currentUser.roles.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center space-x-1 mb-1">
                <Briefcase className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">行业身份</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {currentUser.roles.map(roleId => {
                  const role = INDUSTRY_ROLES.find(r => r.id === roleId);
                  return role ? (
                    <span
                      key={roleId}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    >
                      {role.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>加入时间：{new Date(currentUser.joinDate).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleUserProfileCard;
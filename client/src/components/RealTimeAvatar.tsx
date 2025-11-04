import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface RealTimeAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  updateKey?: number;
}

const RealTimeAvatar: React.FC<RealTimeAvatarProps> = ({ 
  user, 
  size = 'md', 
  className = '', 
  onClick,
  updateKey = 0
}) => {
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(Date.now());

  // 尺寸映射
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  // 监听头像变化
  useEffect(() => {
    if (user.avatar) {
      // 添加时间戳避免缓存
      const timestampedSrc = user.avatar.includes('#') 
        ? user.avatar 
        : `${user.avatar}#${Date.now()}`;
      setAvatarSrc(timestampedSrc);
      setImageKey(Date.now());
    } else {
      setAvatarSrc(null);
    }
  }, [user.avatar, updateKey]);

  // 监听外部更新
  useEffect(() => {
    if (updateKey > 0) {
      setImageKey(Date.now());
    }
  }, [updateKey]);

  return (
    <div 
      className={`${sizeClasses[size]} bg-emerald-600/20 rounded-full flex items-center justify-center border border-emerald-500/30 overflow-hidden cursor-pointer ${className}`}
      data-username={user.username}
      role="button"
      tabIndex={0}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={user.username}
          className="w-full h-full rounded-full object-cover"
          key={`realtime-avatar-${user.id}-${imageKey}`}
          onError={(e) => {
            console.error('Avatar failed to load');
            setAvatarSrc(null);
          }}
          onLoad={() => {
            // Avatar loaded successfully
          }}
        />
      ) : (
        <span className={`font-bold text-emerald-400 ${
          size === 'sm' ? 'text-xs' :
          size === 'md' ? 'text-sm' :
          size === 'lg' ? 'text-lg' : 'text-2xl'
        }`}>
          {user.username ? user.username.charAt(0).toUpperCase() : '?'}
        </span>
      )}
    </div>
  );
};

export default RealTimeAvatar;


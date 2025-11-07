import React from 'react';
import { showUserCard } from './UserHoverCard';
import { User } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { debugLog } from '../utils/debug';

interface ClickableUserAvatarProps {
  userId: number;
  username: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showUsername?: boolean;
}

const ClickableUserAvatar: React.FC<ClickableUserAvatarProps> = ({
  userId,
  username,
  avatar,
  size = 'md',
  className = '',
  showUsername = false
}) => {
  const { openChatWith } = useChat();
  const { user } = useAuth();

  // 获取尺寸样式
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6';
      case 'lg':
        return 'w-12 h-12';
      default:
        return 'w-8 h-8';
    }
  };

  // 获取图标尺寸
  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 12;
      case 'lg':
        return 24;
      default:
        return 16;
    }
  };

  // 点击处理
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 不能和自己聊天
    if (userId === user?.id) {
      debugLog('不能与自己聊天');
      return;
    }
    
    debugLog('🔥 点击用户头像，开启聊天:', { userId, username });
    
    // 开启与该用户的聊天
    openChatWith({
      id: userId,
      username,
      avatar
    });
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={handleClick}
        className={`${getSizeClasses()} rounded-full overflow-hidden transition-all duration-200 cursor-pointer group avatar-btn focus:outline-none focus:ring-0 focus-visible:outline-none outline-none ring-0`}
        title={`与 ${username} 私信`}
        onClickCapture={(e) => {
          // 点击头像先展示用户卡片
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          showUserCard(username, rect);
        }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={username}
            className="w-full h-full object-cover group-hover:brightness-110 transition-all"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:from-blue-600 group-hover:to-purple-700 transition-all">
            <User size={getIconSize()} className="text-white" />
          </div>
        )}
      </button>
      
      {showUsername && (
        <button
          onClick={handleClick}
          className="text-sm font-medium text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer"
          title={`与 ${username} 私信`}
          onClickCapture={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            showUserCard(username, rect);
          }}
        >
          {username}
        </button>
      )}
    </div>
  );
};

export default ClickableUserAvatar;

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { debugLog } from '../utils/debug';

interface ChatUser {
  id: number;
  username: string;
  avatar?: string;
}

interface ChatContextType {
  isOpen: boolean;
  selectedUserId: number | null;
  selectedUserInfo: ChatUser | null;
  totalUnreadCount: number;
  setTotalUnreadCount: (count: number) => void;
  openChatWith: (user: ChatUser) => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState<ChatUser | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const openChatWith = (user: ChatUser) => {
    debugLog('🔥 开启与用户的聊天:', user);
    setSelectedUserId(user.id);
    setSelectedUserInfo(user);
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    // 不清除selectedUserId，保持选中状态
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const value: ChatContextType = {
    isOpen,
    selectedUserId,
    selectedUserInfo,
    totalUnreadCount,
    openChatWith,
    closeChat,
    toggleChat,
    setTotalUnreadCount
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;

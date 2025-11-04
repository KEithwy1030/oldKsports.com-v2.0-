import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { filterValidUsers, validateChatUser } from '../utils/userDataValidator';

interface ChatMessage {
  id: number;
  sender_id: number;
  sender_username: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ChatUser {
  id: number;
  username: string;
  avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const { isOpen, selectedUserId, selectedUserInfo, totalUnreadCount, setTotalUnreadCount, closeChat, toggleChat } = useChat();
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [localSelectedUserId, setLocalSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWidgetRef = useRef<HTMLDivElement>(null);

  // 当选择用户时清除未读数字（避免无限循环）
  const clearUnreadForUser = useCallback((userId: number) => {
    setChatUsers(prev => {
      const targetUser = prev.find(u => u.id === userId);
      if (targetUser && targetUser.unread_count > 0) {
        console.log('🔥 清除用户未读数字:', targetUser.username, '数量:', targetUser.unread_count);
        
        // 清除该用户的未读数字（总数会在useEffect中自动重新计算）
        return prev.map(u => 
          u.id === userId 
            ? { ...u, unread_count: 0 } 
            : u
        );
      }
      return prev;
    });
  }, []); // 空依赖数组，避免无限循环

  // 标记消息为已读
  const markMessagesAsRead = useCallback(async (userId: number) => {
    if (!userId) {
      console.log('🔥 markMessagesAsRead: userId无效', userId);
      return;
    }
    
    console.log('🔥 标记消息已读:', userId);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      await fetch(`${apiUrl}/messages/mark-read/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('oldksports_auth_token')}`
        }
      });
      
      // 已在selectUser中更新了本地状态
      console.log('🔥 消息已标记为已读');
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  }, []);

  // 标记所有消息为已读
  const markAllMessagesAsRead = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/messages/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('oldksports_auth_token')}`
        }
      });
      
      if (response.ok) {
        console.log('🔥 所有消息已标记为已读');
      }
    } catch (error) {
      console.error('标记所有消息已读失败:', error);
    }
  }, []);

  // 重新计算总未读数（当chatUsers变化时）
  useEffect(() => {
    const total = chatUsers.reduce((sum, u) => sum + (u.unread_count || 0), 0);
    setTotalUnreadCount(total);
    console.log('🔥 根据用户列表重新计算总未读数:', total);
  }, [chatUsers, setTotalUnreadCount]);

  // 同步外部选中的用户ID
  useEffect(() => {
    if (selectedUserId && selectedUserId !== localSelectedUserId) {
      setLocalSelectedUserId(selectedUserId);
      clearUnreadForUser(selectedUserId);
      
      // 如果该用户在chatUsers中不存在，使用selectedUserInfo添加
      if (selectedUserInfo) {
        setChatUsers(prev => {
          const existingUser = prev.find(u => u.id === selectedUserId);
          if (!existingUser) {
            console.log('🔥 添加新用户到聊天列表:', selectedUserInfo);
            return [...prev, {
              id: selectedUserInfo.id,
              username: selectedUserInfo.username,
              avatar: selectedUserInfo.avatar,
              last_message: '',
              last_message_time: new Date().toISOString(),
              unread_count: 0
            }];
          }
          return prev;
        });
      }
    }
  }, [selectedUserId, selectedUserInfo, localSelectedUserId, clearUnreadForUser]);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 获取聊天用户列表
  const fetchChatUsers = useCallback(async () => {
    if (!user) {
      console.warn('🔥 ChatWidget: 用户未登录，跳过获取聊天用户');
      return;
    }
    
    console.log('🔥 ChatWidget: 开始获取聊天用户，当前用户:', {
      userId: user.id,
      username: user.username,
      userType: typeof user
    });
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/messages/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('oldksports_auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('🔥 获取到的聊天用户数据:', data.data);
          
          // 过滤掉无效的用户数据
          const validUsers = filterValidUsers(data.data);
          
          console.log('🔥 过滤后的有效用户:', validUsers);
          setChatUsers(validUsers);
          
          // 重新计算总未读数
          const total = validUsers.reduce((sum: number, u: any) => sum + (u.unread_count || 0), 0);
          console.log('🔥 重新计算总未读数:', total);
          setTotalUnreadCount(total);
          
          // 如果没有选中用户且有聊天记录，选择第一个有效用户（避免无限循环）
          if (!localSelectedUserId && !selectedUserId && validUsers.length > 0) {
            // 选择第一个有效用户
            const validUser = validUsers[0];
            
            if (validUser) {
              console.log('🔥 自动选择第一个有效用户:', validUser);
              // 直接设置，避免循环
              setLocalSelectedUserId(validUser.id);
            } else {
              console.warn('🔥 没有找到有效的聊天用户');
            }
          }
        }
      } else {
        console.error('🔥 获取聊天用户失败:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('获取聊天用户失败:', error);
    }
  }, [user]); // 只依赖 user，避免循环

  // 获取与特定用户的消息
  const fetchMessagesWithUser = useCallback(async (userId: number) => {
    if (!user || !userId) {
      console.log('🔥 fetchMessagesWithUser: 用户或userId无效', { user: !!user, userId });
      return;
    }
    
    console.log('🔥 获取与用户的消息:', userId);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/messages/conversation/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('oldksports_auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.data);
        }
      }
    } catch (error) {
      console.error('获取对话消息失败:', error);
    }
  }, [user]);

  // 发送消息
  const sendMessage = async () => {
    const currentUserId = localSelectedUserId || selectedUserId;
    if (!newMessage.trim() || !user || !currentUserId || isSending) return;
    
    setIsSending(true);
    const messageToSend = newMessage; // 保存消息内容
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('oldksports_auth_token')}`
        },
        body: JSON.stringify({
          content: newMessage,
          receiver_id: currentUserId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // 立即添加消息到本地状态，提供即时反馈
        const newMsg: ChatMessage = {
          id: result.messageId || Date.now(),
          sender_id: user.id,
          sender_username: user.username,
          sender_avatar: user.avatar,
          content: messageToSend,
          created_at: new Date().toISOString(),
          is_read: false
        };
        
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        
        // 然后异步刷新数据确保同步
        setTimeout(() => {
          fetchMessagesWithUser(currentUserId);
          fetchChatUsers();
        }, 100);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setIsSending(false);
    }
  };

  // 选择聊天用户
  const selectUser = useCallback((userId: number) => {
    console.log('🔥 选择聊天用户:', userId, typeof userId);
    
    if (userId !== localSelectedUserId) {
      setLocalSelectedUserId(userId);
      fetchMessagesWithUser(userId);
      clearUnreadForUser(userId);
      
      // 标记与该用户的消息为已读
      markMessagesAsRead(userId);
    }
  }, [localSelectedUserId, fetchMessagesWithUser, clearUnreadForUser, markMessagesAsRead]);

  // 处理回车发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 定期获取新消息
  useEffect(() => {
    if (user) {
      fetchChatUsers();
      const interval = setInterval(fetchChatUsers, 5000); // 每5秒检查新消息
      return () => clearInterval(interval);
    }
    return undefined; // 确保所有代码路径都有返回值
  }, [user]); // 移除 fetchChatUsers 依赖，避免循环

  // 当选中用户时，更频繁地检查该对话的新消息
  useEffect(() => {
    const currentUserId = localSelectedUserId || selectedUserId;
    if (currentUserId && isOpen) {
      const interval = setInterval(() => {
        fetchMessagesWithUser(currentUserId);
      }, 3000); // 每3秒检查当前对话的新消息
      return () => clearInterval(interval);
    }
    return undefined; // 确保所有代码路径都有返回值
  }, [localSelectedUserId, selectedUserId, isOpen, fetchMessagesWithUser]);

  // 点击外部关闭聊天框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && chatWidgetRef.current && !chatWidgetRef.current.contains(event.target as Node)) {
        console.log('🔥 点击外部，关闭聊天框');
        closeChat();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined; // 确保所有代码路径都有返回值
  }, [isOpen, closeChat]);

  // 当选中用户变化时，获取对话消息
  useEffect(() => {
    const currentUserId = localSelectedUserId || selectedUserId;
    if (currentUserId) {
      fetchMessagesWithUser(currentUserId);
    }
  }, [localSelectedUserId, selectedUserId, fetchMessagesWithUser]);

  // 格式化时间
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!user) return null;

  return (
    <>
      {/* 浮动消息图标 */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => {
              console.log('🔥 点击消息图标，打开聊天框');
              toggleChat();
              
              // 打开聊天框时清除所有未读提醒
              if (totalUnreadCount > 0) {
                console.log('🔥 清除所有未读消息提醒');
                setTotalUnreadCount(0);
                
                // 清除所有用户的未读数字
                setChatUsers(prev => 
                  prev.map(u => ({ ...u, unread_count: 0 }))
                );
                
                // 调用后端API标记所有消息为已读
                markAllMessagesAsRead();
              }
            }}
            className="relative w-14 h-14 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-full shadow-2xl hover:shadow-emerald-500/25 hover:scale-110 transition-all duration-300 flex items-center justify-center"
          >
            <MessageCircle size={24} />
            {totalUnreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg animate-pulse">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </div>
            )}
          </button>
        </div>
      )}

      {/* 聊天窗口 - 左右分栏布局 */}
      {isOpen && (
        <div 
          ref={chatWidgetRef}
          className="fixed bottom-6 right-6 z-50 w-[600px] h-[500px] bg-white dark:bg-slate-800/95 backdrop-blur-lg rounded-2xl border border-gray-200 dark:border-slate-600/50 shadow-2xl overflow-hidden"
        >
          {/* 聊天窗口头部 */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle size={18} className="text-white" />
              <h3 className="font-semibold text-white">私信</h3>
              {totalUnreadCount > 0 && (
                <span className="bg-white/20 text-white text-xs rounded-full px-2 py-1">
                  {totalUnreadCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 text-white/80 hover:text-white transition-colors"
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={closeChat}
                className="p-1 text-white/80 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 聊天内容区域 - 左右分栏布局 */}
          {!isMinimized && (
            <div className="flex h-[450px]">
              {/* 左侧：用户列表 */}
              <div className="w-48 bg-gray-50 dark:bg-slate-900/50 border-r border-gray-200 dark:border-slate-600/50">
                {/* 用户列表标题 */}
                <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-600/50">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">最近聊天</h4>
                </div>
                
                {/* 用户列表 */}
                <div className="overflow-y-auto h-[400px]">
                  {chatUsers.length > 0 ? (
                    chatUsers.map((chatUser) => (
                      <button
                        key={chatUser.id}
                        onClick={() => selectUser(Number(chatUser.id))}
                        className={`w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-slate-700/30 transition-colors border-b border-gray-200 dark:border-slate-700/30 ${
                          (localSelectedUserId || selectedUserId) === chatUser.id ? 'bg-emerald-100 dark:bg-emerald-600/20 border-l-2 border-l-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {/* 用户头像 */}
                          {chatUser.avatar ? (
                            <img
                              src={chatUser.avatar}
                              alt={chatUser.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                              <User size={16} className="text-gray-600 dark:text-gray-400" />
                            </div>
                          )}
                          
                          {/* 用户信息 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {chatUser.username}
                              </span>
                              {chatUser.unread_count > 0 && (
                                <div className="bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                                  {chatUser.unread_count > 99 ? '99+' : chatUser.unread_count}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                              {chatUser.last_message || '暂无消息'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                              {formatMessageTime(chatUser.last_message_time)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <User size={24} className="text-gray-500 dark:text-gray-500 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">暂无聊天记录</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧：聊天内容 */}
              <div className="flex-1 flex flex-col">
                {(localSelectedUserId || selectedUserId) ? (
                  <>
                    {/* 聊天对象信息 */}
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-600/50 bg-gray-50 dark:bg-slate-800/50">
                      {(() => {
                        const currentUserId = localSelectedUserId || selectedUserId;
                        const selectedUser = chatUsers.find(u => u.id === currentUserId);
                        return selectedUser ? (
                          <div className="flex items-center space-x-2">
                            {selectedUser.avatar ? (
                              <img
                                src={selectedUser.avatar}
                                alt={selectedUser.username}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <User size={16} className="text-gray-600 dark:text-gray-400" />
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              与 {selectedUser.username} 的对话
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <User size={16} className="text-gray-600 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              正在加载用户信息...
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 消息列表 */}
                    <div className="flex-1 p-3 overflow-y-auto bg-gray-50 dark:bg-slate-900/30">
                      {messages.length > 0 ? (
                        <div className="space-y-2">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[75%] ${
                                message.sender_id === user.id
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-gray-300'
                              } rounded-lg px-3 py-2 shadow-lg`}>
                                <p className="text-sm break-words">{message.content}</p>
                                <div className="text-xs opacity-75 mt-1 text-right">
                                  {formatMessageTime(message.created_at)}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MessageCircle size={32} className="text-gray-500 dark:text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-600 dark:text-gray-400 text-sm">暂无对话消息</p>
                          <p className="text-gray-500 dark:text-gray-500 text-xs">开始聊天吧！</p>
                        </div>
                      )}
                    </div>

                    {/* 消息输入区域 */}
                    <div className="border-t border-gray-200 dark:border-slate-600/50 p-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={`给 ${chatUsers.find(u => u.id === (localSelectedUserId || selectedUserId))?.username || '用户'} 发消息...`}
                          className="flex-1 bg-gray-100 dark:bg-slate-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || isSending}
                          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Send size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  // 未选择用户时的提示
                  <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-900/30">
                    <div className="text-center">
                      <MessageCircle size={48} className="text-gray-500 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">选择一个聊天</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">从左侧选择用户开始对话</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;

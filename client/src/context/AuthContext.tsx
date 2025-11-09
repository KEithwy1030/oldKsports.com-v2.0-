// client/src/context/AuthContext.tsx (FINAL-FIXED VERSION 2)

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { userAPI, authAPI, healthCheck, databaseCheck, handleApiError, forumAPI } from '../utils/api';
import { clearAllUserCache } from '../components/UserHoverCard';
import { getUserLevel } from '../utils/userUtils';
import { forceCleanup, validateUserData, getSafeUsername } from '../utils/forceCleanup';
import { debugLog } from '../utils/debug';

const BOT_ACCOUNTS_KEY = 'oldksports_bot_accounts';
const FORUM_POSTS_KEY = 'oldksports_forum_posts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, roles?: string[]) => Promise<boolean>;
  logout: () => void;
  updateUserPoints: (points: number) => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
  recalculateUserLevel: () => void;
  refreshUserData: () => Promise<void>;
  checkHealth: () => Promise<any>;
  checkDatabase: () => Promise<any>;
  getBotAccounts: () => User[];
  addBotAccounts: (bots: any[]) => void;
  updateBotAccount: (botId: string, updatedData: Partial<User>) => void;
  getForumPosts: () => Promise<any[]>;
  addForumPost: (post: any) => void;
  updateForumPost: (postId: string, updatedData: Partial<any>) => void;
  addForumReply: (postId: string, reply: any) => void;
  incrementPostViews: (postId: string) => void;
  addReplyToPost: (postId: string, reply: any) => void;
  onAvatarUpdate: (callback: (user: User) => void) => () => void;
  removeAvatarUpdateListener: (callback: (user: User) => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const avatarUpdateListeners = useRef<((user: User) => void)[]>([]);
  
  // 紧急防护：确保用户数据完整性（更宽松的检查）
  const getSafeUser = useCallback(() => {
    debugLog('🔍 AuthContext getSafeUser检查:', {
      hasUser: !!user,
      userId: user?.id,
      username: user?.username,
      userType: typeof user
    });
    
    // 只在真正异常时才返回null，给正常用户更多容错空间
    if (!user) {
      console.warn('🔍 AuthContext: 用户对象不存在，返回null');
      return null;
    }
    
    // 检查关键字段，但允许部分字段为空
    if (!user.id || !user.username) {
      console.warn('🔍 AuthContext: 用户关键数据缺失，返回null');
      return null;
    }
    
    // 只在数据明显损坏时才强制清理
    if (user.username === 'undefined' || user.username === 'null' || user.id === 'undefined' || user.id === 'null') {
      console.warn('🔍 AuthContext: 用户数据明显损坏，强制清理');
      forceCleanup();
      return null;
    }
    
    debugLog('🔍 AuthContext: 用户数据验证通过');
    return user;
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('oldksports_auth_token');
    const savedUser = localStorage.getItem('oldksports_user');
    
    debugLog('AuthContext初始化检查:', {
      hasToken: !!token,
      hasSavedUser: !!savedUser,
      tokenLength: token ? token.length : 0,
      savedUserContent: savedUser ? JSON.parse(savedUser) : null
    });
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        
        // 验证用户数据完整性（更宽松的检查）
        debugLog('🔍 解析用户数据:', {
          id: userData.id,
          username: userData.username,
          idType: typeof userData.id,
          usernameType: typeof userData.username,
          hasId: !!userData.id,
          hasUsername: !!userData.username
        });
        
        // 只在数据明显损坏时才清理
        if (!userData.id || !userData.username || 
            userData.username === 'undefined' || userData.username === 'null' ||
            userData.id === 'undefined' || userData.id === 'null') {
          console.error('🔍 用户数据明显损坏:', userData);
          localStorage.removeItem('oldksports_auth_token');
          localStorage.removeItem('oldksports_user');
          setIsLoading(false);
          return;
        }
        
        // 确保用户ID是数字类型，但允许更多容错
        const userId = parseInt(userData.id);
        if (isNaN(userId) || userId <= 0) {
          console.error('🔍 用户ID无效:', userData.id);
          localStorage.removeItem('oldksports_auth_token');
          localStorage.removeItem('oldksports_user');
          setIsLoading(false);
          return;
        }
        
        // 确保所有字段正确映射，特别是isAdmin字段和日期字段
        const processedUserData = {
          ...userData,
          isAdmin: userData.is_admin || userData.isAdmin || false,
          hasUploadedAvatar: userData.has_uploaded_avatar || userData.hasUploadedAvatar || false,
          joinDate: userData.joinDate ? new Date(userData.joinDate) : (userData.created_at ? new Date(userData.created_at) : new Date())
        };
        
        debugLog('AuthContext初始化 - 从localStorage加载用户数据:', userData);
        debugLog('AuthContext初始化 - 处理后的用户数据:', processedUserData);
        debugLog('用户ID验证:', {
          id: processedUserData.id,
          idType: typeof processedUserData.id,
          username: processedUserData.username
        });
        
        setUser(processedUserData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('oldksports_auth_token');
        localStorage.removeItem('oldksports_user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(email, password);
      const userData = response.user || response;
      
      // 确保令牌同步到所有位置
      if (response.token) {
        localStorage.setItem('oldksports_auth_token', response.token);
        localStorage.setItem('access_token', response.token); // 兼容性
        debugLog('登录成功 - 令牌已同步到所有位置');
        debugLog('🔑 Token存储验证:', {
          oldksports_auth_token: localStorage.getItem('oldksports_auth_token') ? '已存储' : '未存储',
          access_token: localStorage.getItem('access_token') ? '已存储' : '未存储',
          tokenLength: response.token.length
        });
      } else {
        console.error('❌ 登录响应中没有token:', response);
      }
      
      // 处理字段映射，确保所有字段正确
      const processedUserData = {
        ...userData,
        isAdmin: userData.isAdmin || false,
        hasUploadedAvatar: userData.hasUploadedAvatar || false,
        joinDate: userData.joinDate ? new Date(userData.joinDate) : (userData.created_at ? new Date(userData.created_at) : new Date())
      };
      
      debugLog('Login - 原始用户数据:', userData);
      debugLog('Login - 处理后的用户数据:', processedUserData);
        debugLog('Login - isAdmin字段检查:', {
        原始isAdmin: userData.isAdmin,
        最终isAdmin: processedUserData.isAdmin
      });
      
      // 将处理后的数据保存到localStorage
      localStorage.setItem('oldksports_user', JSON.stringify(processedUserData));
      debugLog('Login - 头像信息:', {
        hasAvatar: !!processedUserData.avatar,
        avatarLength: processedUserData.avatar?.length,
        hasUploadedAvatar: processedUserData.hasUploadedAvatar
      });
      
      setUser(processedUserData);
      setIsAuthenticated(true);
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('onboarding_relogin_flag', '1');
          window.dispatchEvent(new Event('auth-success'));
        } catch (eventError) {
          console.warn('派发 auth-success 事件失败:', eventError);
        }
      }
      
      // 清除用户卡片缓存，确保显示最新数据
      clearAllUserCache();
      
      return true;
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        const backendMessage = data.message || data.error || '';
        
        // 区分不同的错误类型
        if (status === 404) {
          // 404 表示用户不存在
          if (backendMessage.includes('用户不存在')) {
            throw new Error('用户不存在，请先注册');
          }
          // 其他404错误也统一为密码错误（安全考虑，不暴露用户是否存在）
          throw new Error('登录邮箱或密码错误');
        }
        
        if (status === 400) {
          // 400 可能是密码错误或格式错误
          if (backendMessage.includes('密码错误') || backendMessage.includes('用户名或密码错误')) {
            throw new Error('登录邮箱或密码错误');
          }
          // 使用后端返回的具体错误消息，如果没有则用默认消息
          throw new Error(backendMessage || '登录信息格式错误，请检查输入');
        }
        
        if (status === 401) {
          // 401 通常是认证失败
          throw new Error(backendMessage || '登录邮箱或密码错误');
        }
        
        if (status === 500) throw new Error('服务器暂时不可用，请稍后重试');
        throw new Error(backendMessage || '登录失败，请重试');
      } else if (error.request) {
        throw new Error('网络连接异常，请检查网络后重试');
      } else {
        throw new Error(error.message || '登录失败，请重试');
      }
    }
  };
  
  const register = async (username: string, email: string, password: string, roles?: string[]): Promise<boolean> => {
    try {
      const response = await authAPI.register(username, email, password, roles);
      const userData = response.user || response;
      
      // 确保令牌同步到所有位置
      if (response.token) {
        localStorage.setItem('oldksports_auth_token', response.token);
        localStorage.setItem('access_token', response.token); // 兼容性
        debugLog('注册成功 - 令牌已同步到所有位置');
        debugLog('🔑 注册Token存储验证:', {
          oldksports_auth_token: localStorage.getItem('oldksports_auth_token') ? '已存储' : '未存储',
          access_token: localStorage.getItem('access_token') ? '已存储' : '未存储',
          tokenLength: response.token.length
        });
      } else {
        console.error('❌ 注册响应中没有token:', response);
      }
      
      // 处理字段映射，确保所有字段正确
      const processedUserData = {
        ...userData,
        isAdmin: userData.isAdmin || false,
        hasUploadedAvatar: userData.hasUploadedAvatar || false,
        joinDate: userData.joinDate ? new Date(userData.joinDate) : (userData.created_at ? new Date(userData.created_at) : new Date())
      };
      
      debugLog('注册成功 - 原始用户数据:', userData);
      debugLog('注册成功 - 处理后的用户数据:', processedUserData);
      
      // 将处理后的数据保存到localStorage
      localStorage.setItem('oldksports_user', JSON.stringify(processedUserData));
      
      setUser(processedUserData);
      setIsAuthenticated(true);
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('onboarding_relogin_flag', '1');
          window.dispatchEvent(new Event('auth-success'));
        } catch (eventError) {
          console.warn('派发 auth-success 事件失败:', eventError);
        }
      }
      
      // 清除用户卡片缓存，确保显示最新数据
      clearAllUserCache();
      
      return true;
    } catch (error: any) {
      console.error('Registration failed:', error);
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        if (status === 409) throw new Error('用户名或邮箱已被注册，请更换后重试');
        if (status === 400) throw new Error('注册信息格式错误，请检查输入');
        if (status === 500) throw new Error('服务器暂时不可用，请稍后重试');
        throw new Error(data.error || data.message || '注册失败，请重试');
      } else if (error.request) {
        throw new Error('网络连接异常，请检查网络后重试');
      } else {
        throw new Error(error.message || '注册失败，请重试');
      }
    }
  };
  
  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // 新增：处理无效token的函数
  const handleInvalidToken = useCallback(() => {
    console.warn('处理无效token，清理用户状态...');
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
    // 显示提示信息
    alert('登录已过期，请重新登录');
    // 跳转到登录页面
    window.location.href = '/login';
  }, []);

  const updateUserPoints = async (pointsToAdd: number) => {
    if (!user) return;
    
    const newTotalPoints = user.points + pointsToAdd;
    debugLog('Adding', pointsToAdd, 'points to user. From', user.points, 'to', newTotalPoints);
    
    try {
      // 尝试调用API更新积分
      const response = await userAPI.updatePoints(newTotalPoints);
      // 确保保留所有用户数据，特别是头像数据
      const updatedUser = { 
        ...user, 
        points: newTotalPoints, 
        level: getUserLevel(newTotalPoints),
        // 明确保留头像相关字段
        avatar: user.avatar,
        hasUploadedAvatar: user.hasUploadedAvatar
      };
      setUser(updatedUser);
      localStorage.setItem('oldksports_user', JSON.stringify(updatedUser));
      
      debugLog('Points updated successfully via API:', updatedUser);
      
      // 强制重新渲染UI
      setTimeout(() => {
        setUser(prev => prev ? { ...prev } : null);
      }, 100);
      
      return response;
    } catch (error) {
      console.warn('API update points failed, using local fallback:', error);
      
      // API失败时的本地回退机制
      const updatedUser = { 
        ...user, 
        points: newTotalPoints, 
        level: getUserLevel(newTotalPoints),
        // 明确保留头像相关字段
        avatar: user.avatar,
        hasUploadedAvatar: user.hasUploadedAvatar
      };
      setUser(updatedUser);
      localStorage.setItem('oldksports_user', JSON.stringify(updatedUser));
      
      debugLog('Points updated locally:', updatedUser);
      
      // 强制重新渲染UI
      setTimeout(() => {
        setUser(prev => prev ? { ...prev } : null);
      }, 100);
      
      // 返回一个模拟的成功响应
      return { success: true, message: 'Points updated locally' };
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) throw new Error('Cannot update user: user is null');
    try {
      await userAPI.updateProfile(userData as any);
      
      // 处理日期字段
      const processedUserData = {
        ...userData,
        joinDate: userData.joinDate ? (userData.joinDate instanceof Date ? userData.joinDate : new Date(userData.joinDate)) : user.joinDate
      };
      
      const updatedUser: User = { 
        ...user, 
        ...processedUserData, 
        level: userData.points ? getUserLevel(userData.points) : user.level 
      } as User;
      
      setUser(updatedUser);
      localStorage.setItem('oldksports_user', JSON.stringify(updatedUser));
      if (userData.avatar && userData.avatar !== user.avatar) {
        avatarUpdateListeners.current.forEach(listener => listener(updatedUser));
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      throw new Error(handleApiError(error as Error));
    }
  };

  // 重新计算用户等级（用于等级积分要求变更后）
  const recalculateUserLevel = useCallback(() => {
    setUser(prevUser => {
      if (!prevUser) return prevUser;
      const updatedUser = { ...prevUser, level: getUserLevel(prevUser.points) };
      localStorage.setItem('oldksports_user', JSON.stringify(updatedUser));
      debugLog('User level recalculated:', updatedUser.level);
      return updatedUser;
    });
  }, []);

  // 强制刷新用户数据（从服务器获取最新数据）
  const refreshUserData = useCallback(async () => {
    if (!user) return;
    
    try {
      debugLog('刷新用户数据...');
      const response = await userAPI.getUserInfo(user.username);
      if (response.success && response.user) {
        const userData = response.user;
        
        // 处理字段映射，确保所有字段正确
        const processedUserData = {
          ...userData,
          isAdmin: userData.isAdmin || false,
          hasUploadedAvatar: userData.hasUploadedAvatar || false,
          joinDate: userData.joinDate ? new Date(userData.joinDate) : (userData.created_at ? new Date(userData.created_at) : new Date())
        };
        
        debugLog('刷新后的用户数据:', processedUserData);
        
        // 更新状态和localStorage
        setUser(processedUserData);
        localStorage.setItem('oldksports_user', JSON.stringify(processedUserData));
        
        // 清除用户卡片缓存，确保显示最新数据
        clearAllUserCache();
        
        debugLog('用户数据刷新成功');
      }
    } catch (error) {
      console.error('刷新用户数据失败:', error);
    }
  }, [user]);

  const onAvatarUpdate = useCallback((callback: (user: User) => void) => {
    avatarUpdateListeners.current.push(callback);
    return () => {
      avatarUpdateListeners.current = avatarUpdateListeners.current.filter(listener => listener !== callback);
    };
  }, []);

  const removeAvatarUpdateListener = useCallback((callback: (user: User) => void) => {
    avatarUpdateListeners.current = avatarUpdateListeners.current.filter(listener => listener !== callback);
  }, []);

  const checkHealth = async () => {
    try { return await healthCheck(); } 
    catch (error) { console.error('Health check failed:', error); throw error; }
  };

  const checkDatabase = async () => {
    try { return await databaseCheck(); } 
    catch (error) { console.error('Database check failed:', error); throw error; }
  };

  const getBotAccounts = useCallback((): User[] => {
    const stored = localStorage.getItem(BOT_ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }, []);
  
  const saveBotAccounts = (bots: any[]) => {
    localStorage.setItem(BOT_ACCOUNTS_KEY, JSON.stringify(bots));
  };
  
  const addBotAccounts = (newBots: any[]) => {
    const existingBots = getBotAccounts();
    saveBotAccounts([...existingBots, ...newBots]);
  };
  
  const updateBotAccount = (botId: string, updatedData: Partial<User>) => {
    const existingBots = getBotAccounts();
    // FIXED: Corrected the type comparison issue by converting bot.id to string.
    const updatedBots = existingBots.map(bot => String(bot.id) === botId ? { ...bot, ...updatedData } : bot);
    saveBotAccounts(updatedBots);
  };

  const getForumPosts = useCallback(async (): Promise<any[]> => {
    try {
      // 优先从后端API获取帖子数据
      const response = await forumAPI.getPosts();
      return response.posts || [];
    } catch (error) {
      console.warn('Failed to fetch posts from API, using localStorage fallback:', error);
      // API失败时使用localStorage作为回退
      const stored = localStorage.getItem(FORUM_POSTS_KEY);
      if (!stored) return [];
      
      return JSON.parse(stored).map((p: any) => {
        // 确保时间戳是有效的
        let timestamp = p.timestamp;
        if (!timestamp) {
          timestamp = new Date().toISOString(); // 如果没有时间戳，使用当前时间
        } else if (typeof timestamp === 'string') {
          // 如果是字符串，检查是否有效
          const date = new Date(timestamp);
          if (isNaN(date.getTime())) {
            timestamp = new Date().toISOString(); // 无效时间戳，使用当前时间
          }
        }
        return { ...p, timestamp };
      });
    }
  }, []);

  const saveForumPosts = (posts: any[]) => {
    localStorage.setItem(FORUM_POSTS_KEY, JSON.stringify(posts));
  };

  const addForumPost = async (post: any) => {
    try {
      // 使用后端API创建帖子
      const response = await forumAPI.createPost(post.title, post.content, post.category);
      return response;
    } catch (error) {
      console.warn('Failed to create post via API, using localStorage fallback:', error);
      // API失败时使用localStorage作为回退
      const existingPosts = await getForumPosts();
      const newPost = { 
        ...post, 
        id: Date.now().toString(), 
        timestamp: new Date().toISOString(), // 使用ISO字符串格式
        likes: 0, 
        replies: [] 
      };
      saveForumPosts([newPost, ...existingPosts]);
      return newPost;
    }
  };

  const updateForumPost = async (postId: string, updatedData: Partial<any>) => {
    // 操作本地存储，避免通过 getForumPosts 触发 API 覆盖
    const raw = localStorage.getItem(FORUM_POSTS_KEY);
    const localPosts = raw ? JSON.parse(raw) : [];
    const updatedPosts = localPosts.map((post: any) => String(post.id) === postId ? { ...post, ...updatedData } : post);
    saveForumPosts(updatedPosts);
  };

  const addReplyToPost = async (postId: string, reply: any) => {
    // 直接操作本地存储，避免 getForumPosts 优先走 API 导致丢数据
    const raw = localStorage.getItem(FORUM_POSTS_KEY);
    const localPosts = raw ? JSON.parse(raw) : [];
    const updatedPosts = localPosts.map((post: any) => {
      if (String(post.id) === postId) {
        const replies = Array.isArray(post.replies) ? post.replies : [];
        const newReply = { ...reply, id: Date.now().toString(), createdAt: new Date(), likes: 0 };
        return { ...post, replies: [...replies, newReply] };
      }
      return post;
    });
    saveForumPosts(updatedPosts);
  };

  const addForumReply = addReplyToPost;

  const incrementPostViews = async (postId: string) => {
    // 直接操作本地存储
    const raw = localStorage.getItem(FORUM_POSTS_KEY);
    const localPosts = raw ? JSON.parse(raw) : [];
    const updatedPosts = localPosts.map((post: any) => String(post.id) === postId ? { ...post, views: (post.views || 0) + 1 } : post);
    saveForumPosts(updatedPosts);
  };

  return (
    <AuthContext.Provider value={{
      user: getSafeUser(), 
      isLoading, 
      isAuthenticated: isAuthenticated && !!getSafeUser(), 
      login, 
      register, 
      logout, 
      updateUserPoints, 
      updateUser, 
      recalculateUserLevel, 
      refreshUserData, 
      checkHealth, 
      checkDatabase,
      getBotAccounts, 
      addBotAccounts, 
      updateBotAccount, 
      getForumPosts, 
      addForumPost, 
      updateForumPost,
      addForumReply, 
      incrementPostViews, 
      addReplyToPost, 
      onAvatarUpdate, 
      removeAvatarUpdateListener
    }}>
      {children}
    </AuthContext.Provider>
  );
};
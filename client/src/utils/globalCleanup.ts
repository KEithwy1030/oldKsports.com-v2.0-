// 全局数据清理工具 - 解决undefined错误
import { debugLog } from './debug';

export const globalCleanup = () => {
  debugLog('🧹 开始全局清理...');
  
  try {
    // 清理所有可能的存储
    localStorage.clear();
    sessionStorage.clear();
    
    // 清理cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    debugLog('🧹 全局清理完成');
    return true;
  } catch (error) {
    console.error('🧹 全局清理失败:', error);
    return false;
  }
};

// 安全获取用户名
export const getSafeUsername = (username: any): string | null => {
  if (!username) return null;
  if (typeof username !== 'string') return null;
  if (username === 'undefined' || username === 'null' || username === '' || username === 'unknown') return null;
  return username;
};

// 安全获取用户ID
export const getSafeUserId = (userId: any): number | null => {
  if (!userId) return null;
  if (typeof userId !== 'number' && typeof userId !== 'string') return null;
  const num = typeof userId === 'string' ? parseInt(userId) : userId;
  if (isNaN(num) || num <= 0) return null;
  return num;
};

// 验证帖子数据
export const validatePostData = (post: any): boolean => {
  if (!post) return false;
  if (!post.id) return false;
  if (!post.title) return false;
  if (!post.content) return false;
  return true;
};

// 安全获取帖子作者
export const getSafePostAuthor = (post: any): string => {
  if (!post) return 'unknown';
  
  const author = post.author || post.username || post.user_name || 'unknown';
  const safeAuthor = getSafeUsername(author);
  
  if (!safeAuthor) {
    console.warn('⚠️ 帖子作者信息无效:', {
      postId: post.id,
      author: author,
      post: post
    });
    return 'unknown';
  }
  
  return safeAuthor;
};

// 安全获取帖子作者（更严格的检查）
export const getSafePostAuthorStrict = (post: any): string | null => {
  if (!post) return null;
  
  const author = post.author || post.username || post.user_name;
  if (!author) return null;
  
  const safeAuthor = getSafeUsername(author);
  if (!safeAuthor) return null;
  
  return safeAuthor;
};

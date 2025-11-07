// 用户ID验证工具 - 根据Zeabur Agent建议
import { debugLog } from './debug';

export const validateUserId = (userId: any): boolean => {
  if (!userId) return false;
  if (typeof userId === 'string' && (userId === 'undefined' || userId === 'null' || userId === '')) return false;
  if (typeof userId === 'number' && (isNaN(userId) || userId <= 0)) return false;
  return true;
};

export const validateUsername = (username: any): boolean => {
  if (!username) return false;
  if (typeof username !== 'string') return false;
  if (username === 'undefined' || username === 'null' || username === '' || username === 'unknown') return false;
  return true;
};

// 在API调用前检查用户ID
export const checkUserIdBeforeApiCall = (userId: any, apiName: string): boolean => {
  debugLog(`🔍 ${apiName}: 检查用户ID:`, {
    userId,
    userIdType: typeof userId,
    isValid: validateUserId(userId)
  });
  
  if (!validateUserId(userId)) {
    console.warn(`🔍 ${apiName}: 用户ID无效，跳过API调用:`, userId);
    return false;
  }
  
  return true;
};

// 在API调用前检查用户名
export const checkUsernameBeforeApiCall = (username: any, apiName: string): boolean => {
  debugLog(`🔍 ${apiName}: 检查用户名:`, {
    username,
    usernameType: typeof username,
    isValid: validateUsername(username)
  });
  
  if (!validateUsername(username)) {
    console.warn(`🔍 ${apiName}: 用户名无效，跳过API调用:`, username);
    return false;
  }
  
  return true;
};

// 环境变量验证工具
import { debugLog } from './debug';

export const validateImageConfig = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const isProd = import.meta.env.PROD;
  
  debugLog('🔍 图片配置验证:', {
    apiUrl,
    isProd,
    location: window.location.origin
  });
  
  // 生产环境验证
  if (isProd) {
    if (!apiUrl) {
      console.error('❌ 生产环境缺少 VITE_API_URL');
      return false;
    }
    
    if (!apiUrl.startsWith('https://')) {
      console.error('❌ 生产环境 VITE_API_URL 应该使用 HTTPS');
      return false;
    }
    
    if (!apiUrl.includes('/api')) {
      console.warn('⚠️ VITE_API_URL 应该包含 /api 路径');
    }
  }
  
  return true;
};

// 图片URL健康检查
export const checkImageUrlHealth = async (imagePath: string): Promise<boolean> => {
  try {
    const response = await fetch(imagePath, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn('🖼️ 图片URL健康检查失败:', imagePath, error);
    return false;
  }
};

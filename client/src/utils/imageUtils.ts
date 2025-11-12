// 图片URL构建工具
// 支持本地开发和生产环境

import { debugLog } from './debug';
import { API_CONFIG } from '../config/api.config';

/**
 * 构建图片URL
 * @param imagePath 图片路径，如 "/uploads/images/filename.jpg"
 * @returns 完整的图片URL
 */
export const buildImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  
  debugLog('🖼️ buildImageUrl 输入:', imagePath);
  debugLog('🖼️ 当前环境:', {
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL
  });
  
  // 环境变量验证
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
    console.error('❌ 生产环境缺少 VITE_API_URL，使用兜底方案');
    return window.location.origin + (imagePath.startsWith('/') ? imagePath : `/${imagePath}`);
  }
  
  // 放行 data:/blob: 这类内联或临时URL（用于刚发表的回复）
  if (imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    debugLog('🖼️ 内联URL，直接返回:', imagePath);
    return imagePath;
  }

  const apiUrl = import.meta.env.VITE_API_URL || API_CONFIG.BASE_URL;
  const baseUrl = apiUrl.startsWith('http') ? apiUrl.replace('/api', '') : (import.meta.env.PROD ? 'https://oldksports.com' : (import.meta.env.VITE_API_BASE_URL || window.location.origin));

  // 如果已经是完整URL，做兼容性规范化
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const url = new URL(imagePath);
      // 所有 /uploads/images 统一强制回落到固定域名，避免跨域部署路径差异
      if (url.pathname.startsWith('/uploads/images/')) {
        const fixed = import.meta.env.PROD ? `https://oldksports.com${url.pathname}` : `${window.location.origin}${url.pathname}`;
        return fixed;
      }
      // 统一 localhost:3001 → 8080（历史本地）
      if (url.hostname === 'localhost' && url.port === '3001') {
        url.port = '';
        url.host = new URL(baseUrl).host; // 用当前后端域
        url.protocol = new URL(baseUrl).protocol;
        return url.toString();
      }
      // 统一旧的zeabur域名到自定义域名
      if (url.hostname === 'oldksports-app.zeabur.app' || url.hostname === 'oldksports-server.zeabur.app') {
        const fixed = import.meta.env.PROD ? `https://oldksports.com${url.pathname}` : `${window.location.origin}${url.pathname}`;
        return fixed;
      }
    } catch {}
    return imagePath;
  }
  
  // 确保路径以 / 开头
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  debugLog('🖼️ API URL:', apiUrl);
  
  // 无论环境，只要是 /uploads/images 的相对路径，生产固定 oldksports.com
  if (normalizedPath.startsWith('/uploads/images/')) {
    const result = import.meta.env.PROD 
      ? `https://oldksports.com${normalizedPath}`
      : `${window.location.origin}${normalizedPath}`;
    debugLog('🖼️ uploads 最终URL:', result);
    return result;
  }

  // 本地开发环境：API URL是 /api，需要替换为后端地址
  if (apiUrl === '/api') {
    // 本地开发时，使用环境变量或默认后端地址
    const backendUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8080');
    const result = `${backendUrl}${normalizedPath}`;
    debugLog('🖼️ 本地开发URL:', result);
    return result;
  }
  
  // 生产环境：API URL是完整URL，替换 /api 为根路径
  if (apiUrl.startsWith('http')) {
    const result = baseUrl + normalizedPath;
    debugLog('🖼️ 生产环境URL:', result);
    return result;
  }
  
  // 兜底方案：使用当前域名
  const result = window.location.origin + normalizedPath;
  debugLog('🖼️ 兜底URL:', result);
  return result;
};

/**
 * 构建图片上传URL
 * @returns 图片上传的完整URL
 */
export const buildUploadUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || API_CONFIG.BASE_URL;
  return `${apiUrl}/upload/images`;
};

/**
 * 检查图片URL是否有效
 * @param imagePath 图片路径
 * @returns 是否有效
 */
export const isValidImagePath = (imagePath: string): boolean => {
  if (!imagePath) return false;
  
  // 检查是否是图片文件
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasValidExtension = imageExtensions.some(ext => 
    imagePath.toLowerCase().includes(ext)
  );
  
  return hasValidExtension;
};

/**
 * 从HTML内容中提取图片URL并修复
 * @param content HTML内容
 * @returns 修复后的HTML内容
 */
export const fixImageUrlsInContent = (content: string): string => {
  if (!content) return content;
  
  // 统一历史绝对URL的域名（生产固定 oldksports.com）
  const backendUrl = import.meta.env.PROD ? 'https://oldksports.com' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);
  let fixedContent = content.replace(
    /http:\/\/localhost:3001(\/uploads\/images\/[^"']*)/g,
    `${backendUrl}$1`
  );

  // 将旧的Zeabur域名统一替换为自定义域名
  fixedContent = fixedContent
    .replace(/https?:\/\/oldksports-app\.zeabur\.app(\/uploads\/images\/[^"']*)/g, `${backendUrl}$1`)
    .replace(/https?:\/\/oldksports-server\.zeabur\.app(\/uploads\/images\/[^"']*)/g, `${backendUrl}$1`);

  // 统一将 /public/uploads/images 前缀改为 /uploads/images
  fixedContent = fixedContent.replace(
    /(["'])(?:\/public)?\/uploads\/images\/([^"']+)(["'])/g,
    (_m, p1, p2, p3) => `${p1}/uploads/images/${p2}${p3}`
  );

  // 处理没有前导斜杠的相对路径：uploads/images/xxx → /uploads/images/xxx
  fixedContent = fixedContent.replace(
    /(["'])uploads\/images\/([^"']+)(["'])/g,
    (_m, p1, p2, p3) => `${p1}/uploads/images/${p2}${p3}`
  );

  // 然后匹配所有img标签的src属性，使用buildImageUrl统一处理
  return fixedContent.replace(
    /<img([^>]+)src=["']([^"']+)["']([^>]*)>/g,
    (match, before, src, after) => {
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        return `<img${before}src="${src}"${after}>`;
      }
      const fixedSrc = buildImageUrl(src);
      return `<img${before}src="${fixedSrc}"${after}>`;
    }
  );
};
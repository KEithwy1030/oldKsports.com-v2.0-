// 图片URL修复工具
import { buildImageUrl } from './imageUtils';
import { debugLog } from './debug';

/**
 * 修复历史数据中的图片URL
 * @param content HTML内容
 * @returns 修复后的HTML内容
 */
export const fixHistoricalImageUrls = (content: string): string => {
  if (!content) return content;
  
  debugLog('🔧 修复历史图片URL:', content.substring(0, 100) + '...');
  
  // 修复各种可能的旧URL格式
  let fixedContent = content;
  
  // 1. 修复 localhost:3001 格式
  fixedContent = fixedContent.replace(
    /http:\/\/localhost:3001(\/uploads\/images\/[^"]*)/g,
    (match, path) => {
      const newUrl = buildImageUrl(path);
      debugLog('🔧 修复 localhost:3001:', match, '->', newUrl);
      return newUrl;
    }
  );
  
  // 2. 修复 oldksports.zeabur.app 格式
  fixedContent = fixedContent.replace(
    /https:\/\/oldksports.*\.zeabur\.app(\/uploads\/images\/[^"]*)/g,
    (match, path) => {
      const newUrl = buildImageUrl(path);
      debugLog('🔧 修复 zeabur.app:', match, '->', newUrl);
      return newUrl;
    }
  );
  
  // 3. 修复相对路径
  fixedContent = fixedContent.replace(
    /<img([^>]+)src="(\/uploads\/images\/[^"]+)"([^>]*)>/g,
    (match, before, src, after) => {
      const newUrl = buildImageUrl(src);
      debugLog('🔧 修复相对路径:', src, '->', newUrl);
      return `<img${before}src="${newUrl}"${after}>`;
    }
  );
  
  return fixedContent;
};

/**
 * 检查图片URL是否需要修复
 * @param content HTML内容
 * @returns 是否需要修复
 */
export const needsImageUrlFix = (content: string): boolean => {
  if (!content) return false;
  
  // 检查是否包含需要修复的URL模式
  const patterns = [
    /http:\/\/localhost:3001/,
    /https:\/\/oldksports.*\.zeabur\.app/,
    /src="\/uploads\/images\//
  ];
  
  return patterns.some(pattern => pattern.test(content));
};

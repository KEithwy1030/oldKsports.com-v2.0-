import React from 'react';
import DOMPurify from 'dompurify';
import { buildImageUrl, fixImageUrlsInContent } from '../utils/imageUtils';
import { fixHistoricalImageUrls, needsImageUrlFix } from '../utils/imageUrlFixer';

interface HtmlContentProps {
  content: string;
  className?: string;
  hideImages?: boolean;
}

const HtmlContent: React.FC<HtmlContentProps> = ({ content, className, hideImages = false }) => {
  // 检查是否需要修复历史图片URL
  const needsFix = needsImageUrlFix(content);
  console.log('🔧 HtmlContent 是否需要修复:', needsFix);
  
  // 先修复历史图片URL，再修复图片URL，确保图片能正确显示
  let processedContent = needsFix ? fixHistoricalImageUrls(content) : content;
  
  // 将换行符 \n 转换为 <br> 标签，确保用户输入的多行文本正确显示
  if (processedContent && typeof processedContent === 'string') {
    processedContent = processedContent.replace(/\n/g, '<br>');
  }
  
  // 如果需要隐藏图片，移除所有img标签和图片容器
  if (hideImages) {
    // 移除所有的<img>标签
    processedContent = processedContent.replace(/<img[^>]*>/gi, '');
    // 移除所有的图片网格容器
    processedContent = processedContent.replace(/<div class="post-images-grid"[^>]*>[\s\S]*?<\/div>/gi, '');
    // 移除所有weibo-grid容器
    processedContent = processedContent.replace(/<div class="weibo-grid"[^>]*>[\s\S]*?<\/div>/gi, '');
  }
  
  const fixedContent = fixImageUrlsInContent(processedContent);
  
  // 使用DOMPurify清理HTML内容，防止XSS攻击
  const sanitizedContent = DOMPurify.sanitize(fixedContent, {
    ALLOWED_TAGS: ['p', 'br', 'img', 'div', 'span', 'strong', 'em', 'u'],
    ALLOWED_ATTR: ['src', 'alt', 'class', 'style', 'width', 'height'],
    ALLOW_DATA_ATTR: false
  });

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

export default HtmlContent;

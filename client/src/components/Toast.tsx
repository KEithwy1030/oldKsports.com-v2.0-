import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info' | 'points' | 'levelup';

interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  visible, 
  message, 
  type, 
  duration = 3000, 
  onClose 
}) => {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined; // 确保所有代码路径都有返回值
  }, [visible, duration, onClose]);

  if (!visible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-600',
          border: 'border-emerald-300/50'
        };
      case 'error':
        return {
          bg: 'bg-red-600',
          border: 'border-red-300/50'
        };
      case 'info':
        return {
          bg: 'bg-blue-600',
          border: 'border-blue-300/50'
        };
      case 'points':
        return {
          bg: 'bg-emerald-600',
          border: 'border-emerald-300/50'
        };
      case 'levelup':
        return {
          bg: 'bg-gradient-to-r from-purple-600 to-pink-600',
          border: 'border-purple-300/50'
        };
      default:
        return {
          bg: 'bg-gray-600',
          border: 'border-gray-300/50'
        };
    }
  };

  const styles = getToastStyles();

  // 处理多行消息（支持 \n 换行）
  const messageLines = message.split('\n');

  return createPortal(
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999]">
      <div className={`${styles.bg} text-white px-6 py-4 rounded-lg shadow-lg border ${styles.border} text-lg font-semibold max-w-md text-center`}>
        {messageLines.map((line, index) => (
          <div key={index} className={index > 0 ? 'mt-1' : ''}>
            {line}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
};

export default Toast;

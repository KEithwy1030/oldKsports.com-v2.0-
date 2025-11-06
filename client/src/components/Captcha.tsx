import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onVerify: (isValid: boolean) => void;
  className?: string;
  placeholder?: string;
}

const Captcha: React.FC<CaptchaProps> = ({ onVerify, className = '', placeholder = '输入验证码' }) => {
  const [captchaCode, setCaptchaCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCaptcha = (code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 120;
    canvas.height = 40;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background with gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#374151');
    gradient.addColorStop(1, '#1f2937');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise lines
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw characters
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const x = 20 + i * 20;
      const y = 20 + (Math.random() - 0.5) * 8; // Random vertical offset
      const angle = (Math.random() - 0.5) * 0.4; // Random rotation

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Random color for each character
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }

    // Add noise dots
    ctx.fillStyle = '#9ca3af';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 2,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  };

  const generateCaptcha = useCallback(() => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(code);
    setUserInput('');
    setIsVerified(false);
    // 避免在首帧渲染内同步触发父组件状态更新，延后一拍
    Promise.resolve().then(() => onVerify(false));
    drawCaptcha(code);
  }, [onVerify]);

  // 防止onVerify频繁触发的关键修复
  useEffect(() => {
    const isValid = userInput === captchaCode && userInput.length === 4;
    
    // 只在验证状态真正改变时才更新状态和调用回调
    if (isValid !== isVerified) {
      setIsVerified(isValid);
      onVerify(isValid);
    }
  }, [userInput, captchaCode, isVerified, onVerify]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setUserInput(value);
  }, []);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-white mb-2">
        验证码
      </label>
      <div className="flex items-stretch space-x-3">
        {/* Captcha Image Display */}
        <div className="flex items-stretch space-x-2">
          <div className="bg-white/10 border border-white/30 rounded-md p-1 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="rounded bg-gray-700"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <button
            type="button"
            onClick={generateCaptcha}
            className="p-3 text-gray-400 hover:text-emerald-400 hover:bg-white/10 rounded-md transition-colors h-12 flex items-center justify-center"
            title="刷新验证码"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {/* Input Field */}
        <div className="flex-1">
          <input
            type="text"
            value={userInput}
            onChange={handleInputChange}
            maxLength={4}
            className={`w-full px-3 py-3 h-12 bg-white/10 border rounded-md focus:outline-none focus:ring-2 text-white placeholder-gray-400 font-mono text-center tracking-wider text-lg ${
              userInput.length === 4
                ? isVerified
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-red-500 focus:ring-red-500'
                : 'border-white/30 focus:ring-emerald-500 focus:border-emerald-500'
            }`}
            placeholder={placeholder}
          />
          {userInput.length === 4 && (
            <div className="mt-2 text-xs text-center">
              {isVerified ? (
                <span className="text-green-400">✓ 验证码正确</span>
              ) : (
                <span className="text-red-400">✗ 验证码错误</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Captcha;
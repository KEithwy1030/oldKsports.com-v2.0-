import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, AlertCircle } from 'lucide-react';
import Captcha from '../components/Captcha';
import RoleSelector from '../components/RoleSelector';
import { handleApiError } from '../utils/api';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

interface AuthPageProps {
  mode: 'login' | 'register';
}

const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    roles: [] as string[],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 创建稳定的回调函数，避免频繁重新渲染
  const handleCaptchaVerify = useCallback((isValid: boolean) => {
    // 仅在值发生变化时更新，减少不必要的渲染与竞态
    setIsCaptchaValid(prev => (prev === isValid ? prev : isValid));
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, [fieldErrors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFieldErrors({});
    
    // 临时移除验证码要求进行测试
    // if (!isCaptchaValid) {
    //   setError('请先完成验证码验证');
    //   return;
    // }
    
    try {
      // 使用 Zod schema 验证表单数据
      if (mode === 'register') {
        const validatedData = registerSchema.parse(formData);
        setIsLoading(true);
        const success = await register(validatedData.username, validatedData.email, validatedData.password);
        if (success) {
          setSuccess('注册成功！正在跳转...');
          setTimeout(() => navigate('/'), 1500);
        }
      } else {
        const loginData = {
          email: formData.email,
          password: formData.password
        };
        const validatedData = loginSchema.parse(loginData);
        setIsLoading(true);
        const success = await login(validatedData.email, validatedData.password);
        if (success) {
          setSuccess('登录成功！正在跳转...');
          setTimeout(() => navigate('/'), 1500);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') {
        // 处理 Zod 验证错误
        const zodError = err as any;
        const errors: Record<string, string> = {};
        if (zodError.errors && Array.isArray(zodError.errors)) {
          zodError.errors.forEach((error: any) => {
            if (error.path && error.path[0] && error.message) {
              errors[error.path[0]] = error.message;
            }
          });
        }
        setFieldErrors(errors);
      } else {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-radial from-slate-700 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2 text-emerald-400 font-bold text-2xl mb-8">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">K</span>
            </div>
            <span>Old K Sports</span>
          </Link>
          <h2 className="text-3xl font-bold text-white">
            {mode === 'login' ? '登录账户' : '注册账户'}
          </h2>
          <p className="mt-2 text-gray-300">
            {mode === 'login' 
              ? '欢迎回到体育自媒体专业社区' 
              : '加入体育自媒体专业社区，开启交流之旅'
            }
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm py-8 px-6 rounded-lg border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <div className="bg-green-500/20 border border-green-400/30 rounded-md p-4 flex items-start space-x-3">
                <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-900 text-xs">✓</span>
                </div>
                <div className="flex-1">
                  <span className="text-green-300 text-sm font-medium">{success}</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-md p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-red-300 text-sm font-medium">{error}</span>
                  {error.includes('网络') && (
                    <p className="text-red-400 text-xs mt-1">提示：请检查网络连接或稍后重试</p>
                  )}
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                  用户名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className={`pl-10 w-full px-3 py-2 bg-white/10 border rounded-md focus:outline-none focus:ring-2 text-white placeholder-gray-400 ${
                      fieldErrors.username ? 'border-red-500 focus:ring-red-500' : 'border-white/30 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                    placeholder={mode === 'register' ? '支持输入中/英文，数字' : '请输入用户名'}
                  />
                </div>
                {fieldErrors.username && (
                  <div className="mt-1 text-red-400 text-sm flex items-start space-x-1">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{fieldErrors.username}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                登录邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="text"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`pl-10 w-full px-3 py-2 bg-white/10 border rounded-md focus:outline-none focus:ring-2 text-white placeholder-gray-400 ${
                    fieldErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-white/30 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  placeholder={mode === 'login' ? '请输入您的登录邮箱地址' : '这是您找回账号的必要信息'}
                />
              </div>
              {fieldErrors.email && (
                <div className="mt-1 text-red-400 text-sm flex items-start space-x-1">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{fieldErrors.email}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                密码
                {mode === 'register' && (
                  <span className="text-gray-400 text-xs ml-2">至少6位，包含大小写字母和数字</span>
                )}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`pl-10 w-full px-3 py-2 bg-white/10 border rounded-md focus:outline-none focus:ring-2 text-white placeholder-gray-400 ${
                    fieldErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-white/30 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  placeholder={mode === 'login' ? '请输入您的登录密码' : '必须至少包含一个大写字母，小写字母和数字'}
                />
              </div>
              {fieldErrors.password && (
                <div className="mt-1 text-red-400 text-sm flex items-start space-x-1">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{fieldErrors.password}</span>
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                  确认密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`pl-10 w-full px-3 py-2 bg-white/10 border rounded-md focus:outline-none focus:ring-2 text-white placeholder-gray-400 ${
                      fieldErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-white/30 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                    placeholder="请再次输入密码"
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <div className="mt-1 text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{fieldErrors.confirmPassword}</span>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label htmlFor="roles" className="block text-sm font-medium text-white mb-2">
                  行业身份
                </label>
                <RoleSelector
                  selectedRoles={formData.roles}
                  onChange={(roles) => {
                    setFormData(prev => ({ ...prev, roles }));
                    // Clear roles error when user selects roles
                    if (fieldErrors.roles) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.roles;
                        return newErrors;
                      });
                    }
                  }}
                />
                {fieldErrors.roles && (
                  <div className="mt-1 text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{fieldErrors.roles}</span>
                  </div>
                )}
              </div>
            )}

            <Captcha 
              onVerify={handleCaptchaVerify}
              className="mb-6"
              placeholder="请正确输入验证码"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
            </button>

            {mode === 'login' && (
              <div className="text-center mt-2">
                <Link 
                  to="/forgot-password" 
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>忘记密码？</span>
                </Link>
              </div>
            )}

            <div className="text-center">
              {mode === 'login' ? (
                <p className="text-sm text-gray-300">
                  还没有账户？{' '}
                  <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
                    立即注册
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-gray-300">
                  已有账户？{' '}
                  <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                    立即登录
                  </Link>
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
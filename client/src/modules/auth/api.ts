// Auth模块API接口
import { apiRequest } from '../../utils/api';
import { AuthResponse, LoginCredentials, RegisterCredentials, User } from './types';

export class AuthAPI {
  /**
   * 用户登录
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 用户注册
   */
  static async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(): Promise<User> {
    return apiRequest<User>('/auth/me');
  }

  /**
   * 用户登出
   */
  static async logout(): Promise<void> {
    return apiRequest<void>('/auth/logout', {
      method: 'POST',
    });
  }

  /**
   * 验证token
   */
  static async verifyToken(token: string): Promise<User> {
    return apiRequest<User>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

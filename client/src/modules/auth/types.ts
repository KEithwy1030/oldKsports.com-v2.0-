// Auth模块类型定义
export interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  level: UserLevel;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserLevel {
  id: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
  message?: string;
}

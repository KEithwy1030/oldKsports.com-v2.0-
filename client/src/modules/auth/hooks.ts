// Auth模块React Hooks
import { useContext } from 'react';
import { AuthContext } from './context';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthState = () => {
  const { user, isAuthenticated, isLoading, error } = useAuth();
  return { user, isAuthenticated, isLoading, error };
};

export const useAuthActions = () => {
  const { login, register, logout, updateUser } = useAuth();
  return { login, register, logout, updateUser };
};

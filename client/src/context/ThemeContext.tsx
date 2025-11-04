import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('oldksports_theme') as Theme;
    // 默认使用夜间模式（深色主题）
    const initialTheme = savedTheme || 'dark';
    console.log('🎨 ThemeContext: 初始化主题状态，从 localStorage 读取:', savedTheme, '初始主题:', initialTheme);
    return initialTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    console.log('🎨 ThemeContext: 主题变化，当前主题:', theme);
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      console.log('🎨 ThemeContext: 设置 data-theme="dark"');
    } else {
      root.setAttribute('data-theme', 'light');
      console.log('🎨 ThemeContext: 设置 data-theme="light"');
    }
    localStorage.setItem('oldksports_theme', theme);
    // 验证设置是否成功
    const actualAttribute = root.getAttribute('data-theme');
    const actualCSSVar = getComputedStyle(root).getPropertyValue('--color-bg-primary').trim();
    console.log('🎨 ThemeContext: 验证设置 - data-theme属性:', actualAttribute, 'CSS变量--color-bg-primary:', actualCSSVar);
  }, [theme]);

  // 初始化时立即应用主题（避免闪烁）
  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('oldksports_theme') as Theme;
    const initialTheme = savedTheme || 'dark';
    console.log('🎨 ThemeContext: 初始化 useEffect，从 localStorage 读取:', savedTheme, '初始主题:', initialTheme);
    if (initialTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      console.log('🎨 ThemeContext: 初始化设置 data-theme="dark"');
    } else {
      root.setAttribute('data-theme', 'light');
      console.log('🎨 ThemeContext: 初始化设置 data-theme="light"');
    }
    // 验证设置是否成功
    const actualAttribute = root.getAttribute('data-theme');
    const actualCSSVar = getComputedStyle(root).getPropertyValue('--color-bg-primary').trim();
    console.log('🎨 ThemeContext: 初始化验证 - data-theme属性:', actualAttribute, 'CSS变量--color-bg-primary:', actualCSSVar);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      console.log('🎨 ThemeContext: 切换主题，从', prev, '到', newTheme);
      return newTheme;
    });
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

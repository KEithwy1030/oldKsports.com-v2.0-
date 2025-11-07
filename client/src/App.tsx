import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CheckinProvider } from './context/CheckinContext';
import { ChatProvider } from './context/ChatContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { ThemeProvider } from './context/ThemeContext';

import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import UserLevelSync from './components/UserLevelSync';
import CheckinReminderModal from './components/CheckinReminderModal';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import ForumPage from './pages/ForumPage';
import ForumSubsectionPage from './pages/ForumSubsectionPage';
import PostDetailPage from './pages/PostDetailPage';
import NewPostPage from './pages/NewPostPage';
import UserProfile from './pages/UserProfile';
import AdminPage from './pages/AdminPage';
import AdminDashboard from './pages/AdminDashboard';
import MerchantManagement from './pages/MerchantManagement';
import BlacklistManagement from './pages/BlacklistManagement';
import AdminLoginPage from './pages/AdminLoginPage';
import MerchantsPage from './pages/MerchantsPage';
import BlacklistPage from './pages/BlacklistPage';
import ArticlesPage from './pages/ArticlesPage';
import ArticleSubmissionPage from './pages/ArticleSubmissionPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotificationsPage from './pages/NotificationsPage';
import ChatWidget from './components/ChatWidget';
import ChatHandlerSetup from './components/ChatHandlerSetup';
import OnboardingModal from './components/OnboardingModal';
import EmergencyGuard from './components/EmergencyGuard';
import ErrorBoundary from './components/ErrorBoundary';
import { initUserHoverAutobind } from './components/UserHoverCard';
import { debugLog } from './utils/debug';
import { useAuth } from './context/AuthContext';
import { useCheckin } from './context/CheckinContext';
import { useOnboarding } from './context/OnboardingContext';

// 内部应用组件，可以使用AuthContext和CheckinContext
const AppContent: React.FC = () => {
  // 用户认证信息
  const { user } = useAuth();
  
  // 签到功能
  const { 
    showCheckinReminder, 
    checkinReminderData, 
    setShowCheckinReminder
  } = useCheckin();
  
  // 新手引导功能
  const {
    onboardingStatus,
    showOnboardingModal,
    setShowOnboardingModal,
    completeOnboardingTask,
    dismissOnboardingForever,
    suppressOnboardingFor
  } = useOnboarding();

  const handleNavigateToCheckin = () => {
    setShowCheckinReminder(false);
    window.location.href = '/profile';
  };

  const handleNavigateToProfile = () => {
    setShowOnboardingModal(false);
    window.location.href = '/profile';
  };

  const handleNavigateToNewPost = () => {
    setShowOnboardingModal(false);
    window.location.href = '/forum/new';
  };

  const handleNavigateToForum = () => {
    setShowOnboardingModal(false);
    window.location.href = '/forum';
  };

  // 初始化用户卡片自动绑定
  useEffect(() => {
    debugLog('🔥 AppContent: 开始初始化用户卡片自动绑定');
    try { 
      initUserHoverAutobind(); 
      debugLog('🔥 AppContent: 用户卡片自动绑定初始化成功');
    } catch (e) { 
      console.error('🔥 AppContent: 用户卡片自动绑定初始化失败:', e); 
    }
  }, []);

  return (
    <>
      <Router>
        <div className="min-h-screen">
          <Navigation />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/forum" element={<ProtectedRoute><ForumPage /></ProtectedRoute>} />
            <Route path="/forum/:subsection" element={<ProtectedRoute><ForumSubsectionPage /></ProtectedRoute>} />
            <Route path="/forum/post/:postId" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
            <Route path="/forum/new" element={<ProtectedRoute><NewPostPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute adminOnly={true}><AdminPage /></ProtectedRoute>} />
            <Route path="/admin/merchants" element={<ProtectedRoute adminOnly={true}><MerchantManagement /></ProtectedRoute>} />
            <Route path="/admin/blacklist" element={<ProtectedRoute adminOnly={true}><BlacklistManagement /></ProtectedRoute>} />
            <Route path="/merchants" element={<ProtectedRoute><MerchantsPage /></ProtectedRoute>} />
            <Route path="/blacklist" element={<ProtectedRoute><BlacklistPage /></ProtectedRoute>} />
            <Route path="/articles" element={<ProtectedRoute><ArticlesPage /></ProtectedRoute>} />
            <Route path="/articles/submit" element={<ProtectedRoute><ArticleSubmissionPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {/* 全局聊天组件 */}
          <ChatWidget />
        </div>
      </Router>
      
      {/* 签到提醒弹窗 */}
      <CheckinReminderModal
        isOpen={showCheckinReminder}
        onClose={() => setShowCheckinReminder(false)}
        onNavigateToCheckin={handleNavigateToCheckin}
        consecutiveDays={checkinReminderData?.consecutiveCheckins || 0}
      />
      
      {/* 新手引导弹窗 */}
      {onboardingStatus && (
        <OnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          status={onboardingStatus}
          onCompleteTask={completeOnboardingTask}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToNewPost={handleNavigateToNewPost}
          onNavigateToForum={handleNavigateToForum}
          onDismissForever={dismissOnboardingForever}
          currentUserLevel={user?.level}
          suppressOnboardingFor={suppressOnboardingFor}
        />
      )}
    </>
  );
};

function App() {
  // 全局兜底：将任何指向旧域名(zeabur.app)且路径为 /uploads/images 的图片地址改写为当前域名
  // 防止由于缓存或旧构建导致的图片 404
  try {
    // 仅在浏览器环境
    if (typeof window !== 'undefined') {
      const rewriteOnce = () => {
        const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
        imgs.forEach(img => {
          const raw = img.getAttribute('src') || '';
          if (!raw) return;
          try {
            const u = new URL(raw, window.location.origin);
            if (/zeabur\.app$/i.test(u.hostname) && u.pathname.startsWith('/uploads/images/')) {
              img.src = `${window.location.origin}${u.pathname}`;
            }
          } catch {}
        });
      };
      // 立即执行一次，并在前几秒内重复数次以覆盖懒加载
      rewriteOnce();
      let count = 0;
      const timer = window.setInterval(() => {
        rewriteOnce();
        if (++count > 5) window.clearInterval(timer);
      }, 1500);
    }
  } catch {}
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <CheckinProvider>
            <OnboardingProvider>
              <EmergencyGuard>
                <ChatProvider>
                  <ChatHandlerSetup />
                  <UserLevelSync />
                  <AppContent />
                </ChatProvider>
              </EmergencyGuard>
            </OnboardingProvider>
          </CheckinProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
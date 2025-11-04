import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  Store, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Award,
  ArrowRight,
  Star,
  User,
  Coffee,
  Briefcase
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import HtmlContent from '../components/HtmlContent';

const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleNavigation = (path: string) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate('/login');
    }
  };

  useEffect(() => {
    // Setup intersection observer for scroll reveal animations
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    // Observe all scroll-reveal elements
    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
  const posts: any[] = []; // Mock posts data

  
  const featuredPosts = posts.slice(0, 3);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-radial dark:from-slate-700 dark:to-slate-900">
        {/* Hero Section - Full Screen Center */}
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto overflow-hidden">
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-8 leading-tight sm:whitespace-nowrap">
              每一个体育媒体人的内行主场
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-12 leading-relaxed">
              一个专为体育媒体人打造的交流社区
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {isAuthenticated ? (
                <Link
                  to="/forum"
                  className="inline-flex items-center px-10 py-4 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
                >
                  进入论坛
                  <ArrowRight className="ml-2" size={20} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-10 py-4 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
                  >
                    立即注册
                    <ArrowRight className="ml-2" size={20} />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center px-10 py-4 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-lg font-semibold hover:bg-emerald-500 hover:text-white transition-all duration-200 text-lg"
                  >
                    登录账户
                  </Link>
                </>
              )}
            </div>
            
            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <div className="w-6 h-10 border-2 border-gray-400 dark:border-white/30 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-gray-600 dark:bg-white/50 rounded-full mt-2 animate-scroll"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections - Need Scroll to See */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

      {/* Featured Posts */}
          <div className="mb-20 scroll-reveal">
            <div className="text-center mb-12 scroll-reveal">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">热门讨论</h2>
              <p className="text-gray-700 dark:text-gray-300">最新最热的体育话题讨论</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {featuredPosts.map((post, index) => (
                <div key={post.id} className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/20 hover:border-emerald-400 transition-all duration-300 overflow-hidden group" style={{ '--stagger-delay': `${11 + index}` } as React.CSSProperties}>
                  <div className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      {post.authorAvatar ? (
                        <img 
                          src={post.authorAvatar} 
                          alt={post.author}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-600/20 rounded-full flex items-center justify-center border border-emerald-400 dark:border-emerald-500/30">
                          <User size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{post.author || '未知用户'}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{post.category}</div>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                      {post.title}
                    </h3>
                    
                    <div className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                      <HtmlContent 
                        content={post.content} 
                        className="post-preview"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <Star size={14} />
                          <span>{post.likes}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MessageSquare size={14} />
                          <span>{(post.replies && post.replies.length) || 0}</span>
                        </span>
                      </div>
                      <span>{new Date(post.timestamp).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-12" style={{ '--stagger-delay': '15' } as React.CSSProperties}>
              <button
                onClick={() => handleNavigation('/forum')}
                className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl"
              >
                查看更多讨论
                <ArrowRight className="ml-2" size={20} />
              </button>
            </div>
          </div>

      {/* Features Section */}
          <div className="mb-20 scroll-reveal scroll-reveal-delay-1">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">平台特色</h2>
              <p className="text-gray-700 dark:text-gray-300">为体育自媒体人打造的专业交流平台</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div 
                onClick={() => handleNavigation('/forum')} 
                className="group cursor-pointer scroll-reveal scroll-reveal-delay-2"
              >
                <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/20 p-8 hover:border-emerald-400 transition-all duration-300 hover:scale-105">
                  <MessageSquare className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">行业论坛</h3>
                  <p className="text-gray-700 dark:text-gray-300">体育自媒体人的交流社区，分享经验，对接资源</p>
                </div>
              </div>
              
              <div 
                onClick={() => handleNavigation('/merchants')} 
                className="group cursor-pointer scroll-reveal scroll-reveal-delay-3"
              >
                <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/20 p-8 hover:border-emerald-400 transition-all duration-300 hover:scale-105">
                  <Store className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">优秀商家</h3>
                  <p className="text-gray-700 dark:text-gray-300">优质服务商和供应商，为体育媒体人提供可靠的商业服务</p>
                </div>
              </div>
              
              <div 
                onClick={() => handleNavigation('/blacklist')} 
                className="group cursor-pointer scroll-reveal scroll-reveal-delay-4"
              >
                <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/20 p-8 hover:border-emerald-400 transition-all duration-300 hover:scale-105">
                  <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">曝光黑榜</h3>
                  <p className="text-gray-700 dark:text-gray-300">曝光不良商家，维护行业秩序，保护从业者权益</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default HomePage;
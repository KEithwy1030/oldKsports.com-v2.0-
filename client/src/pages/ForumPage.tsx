import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { forumAPI, userAPI } from '../utils/api';
import { FORUM_CATEGORIES, USER_LEVELS, INDUSTRY_ROLES, POINTS_SYSTEM } from '../data/constants';
import { formatTimeAgo } from '../utils/formatTime';
import { getUserLevel } from '../utils/userUtils';
import { Plus, Filter, MessageSquare, Clock, Users, Briefcase, AlertTriangle, Reply, Trash2, Star, Coffee, Settings, Search, X, Smile, Image, AtSign, Pin, PinOff } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import PostImageGallery from '../components/PostImageGallery';
import TokenCleaner from '../components/TokenCleaner';
import HtmlContent from '../components/HtmlContent';
import SimpleTextEditor from '../components/SimpleTextEditor';
import { buildImageUrl, fixImageUrlsInContent } from '../utils/imageUtils';
import { tokenSync } from '../utils/tokenSync';
import UserAvatar from '../components/UserAvatar';
import RealTimeAvatar from '../components/RealTimeAvatar';
import { debugLog } from '../utils/debug';
import Toast from '../components/Toast';
import { buildApiUrl } from '../config/api.config';

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  author_level?: string;
  author_points?: number;
  category: string;
  timestamp: string;
  views: number;
  likes: number;
  is_sticky?: boolean;
  is_locked?: boolean;
  author_id?: number;
  replies?: Array<{
    id: number;
    author: string;
    content: string;
    createdAt: string;
  }>;
  reply_count?: number; // 后端返回的回复数量
}

type SubforumStats = {
  totalPosts: number;
  totalReplies: number;
  latestPost: string;
};

const CATEGORY_PARAM_KEY = 'category';

const ForumPage: React.FC = () => {
  const { user, refreshUserData } = useAuth();
  const { openChatWith } = useChat();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validCategoryIds = useMemo(() => {
    const ids = new Set<string>(['all']);
    FORUM_CATEGORIES.forEach((cat) => {
      if (cat.id) {
        ids.add(cat.id);
      }
    });
    return ids;
  }, []);
  const normalizeCategory = useCallback(
    (value: string | null) => {
      if (!value) return 'all';
      return validCategoryIds.has(value) ? value : 'all';
    },
    [validCategoryIds]
  );
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [subforumStats, setSubforumStats] = useState<Record<string, SubforumStats>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'points' | 'levelup'}>({ visible: false, message: '', type: 'info' });
  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    normalizeCategory(searchParams.get(CATEGORY_PARAM_KEY))
  );
  
  // 监听升级事件
  useEffect(() => {
    const handleLevelUp = (event: CustomEvent) => {
      const { oldLevel, newLevel, newPoints } = event.detail;
      setToast({
        visible: true,
        message: `🎉 恭喜！您升级了！\n从 ${oldLevel.name} 升级到 ${newLevel.name}\n当前积分：${newPoints}`,
        type: 'levelup'
      });
    };
    
    window.addEventListener('userLevelUp', handleLevelUp as EventListener);
    return () => {
      window.removeEventListener('userLevelUp', handleLevelUp as EventListener);
    };
  }, []);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: ''
  });
  const [selectedCategoryName, setSelectedCategoryName] = useState('点击选择');
  const [hasSelectedCategory, setHasSelectedCategory] = useState(false);
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const normalized = normalizeCategory(searchParams.get(CATEGORY_PARAM_KEY));
    if (normalized !== selectedCategory) {
      setSelectedCategory(normalized);
    }
  }, [searchParams, normalizeCategory, selectedCategory]);

  const updateCategorySelection = useCallback(
    (nextCategory: string) => {
      const normalizedNext = normalizeCategory(nextCategory);
      setSelectedCategory(normalizedNext);
      const params = new URLSearchParams(searchParams);
      if (normalizedNext === 'all') {
        params.delete(CATEGORY_PARAM_KEY);
      } else {
        params.set(CATEGORY_PARAM_KEY, normalizedNext);
      }
      setSearchParams(params, { replace: false });
    },
    [normalizeCategory, searchParams, setSearchParams]
  );

  // 切换发帖类别
  const togglePostCategory = () => {
    const categories = [
      { id: 'industry', name: '行业茶水间', color: 'emerald' },
      { id: 'business', name: '商务&合作', color: 'blue' },
      { id: 'blacklist', name: '黑榜曝光', color: 'red' }
    ];
    
    if (!hasSelectedCategory) {
      // 首次点击，选择第一个类别
      const firstCategory = categories[0];
      setNewPost(prev => ({ ...prev, category: firstCategory.id }));
      setSelectedCategoryName(firstCategory.name);
      setHasSelectedCategory(true);
    } else {
      // 已选择过，循环切换
      const currentIndex = categories.findIndex(cat => cat.id === newPost.category);
      const nextIndex = (currentIndex + 1) % categories.length;
      const nextCategory = categories[nextIndex];
      
      setNewPost(prev => ({ ...prev, category: nextCategory.id }));
      setSelectedCategoryName(nextCategory.name);
    }
  };

  // 获取当前类别的颜色
  const getCategoryColor = () => {
    const categories = [
      { id: 'industry', color: 'emerald' },
      { id: 'business', color: 'blue' },
      { id: 'blacklist', color: 'red' }
    ];
    
    const currentCategory = categories.find(cat => cat.id === newPost.category);
    return currentCategory?.color || 'emerald';
  };

  // 添加表情包到内容
  const addEmoji = (emoji: string) => {
    setNewPost(prev => ({ ...prev, content: prev.content + emoji }));
    setShowEmojiPicker(false);
  };

  // 添加@到内容
  const addMention = () => {
    setNewPost(prev => ({ ...prev, content: prev.content + '@' }));
    };

  // 直接处理图片上传
  const handleDirectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 检查数量限制
    if (newPostImages.length + files.length > 9) {
      alert('最多只能上传9张图片');
      return;
    }

    try {
      const uploadPromises = files.map(async (file) => {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          throw new Error('请选择图片文件');
        }

        // 检查文件大小 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('图片大小不能超过10MB');
      }

        // 上传图片
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(buildApiUrl('/upload'), {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('图片上传失败');
        }

        const result = await response.json();
        // 使用 buildImageUrl 构建完整URL
        const fullUrl = buildImageUrl(result.url);
        return fullUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setNewPostImages([...newPostImages, ...uploadedUrls]);
    } catch (error) {
      alert(error instanceof Error ? error.message : '图片上传失败');
    }
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const [showTokenCleaner, setShowTokenCleaner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // 侧边栏数据状态
  const [merchants, setMerchants] = useState<any[]>([]);
  const [blacklistEntries, setBlacklistEntries] = useState<any[]>([]);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const postsPerPage = 10;
  
  // 帖子列表容器的引用
  const postsContainerRef = useRef<HTMLDivElement>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [totalOnlineUsers, setTotalOnlineUsers] = useState(0);

  const categories = FORUM_CATEGORIES;
  
  // 帖子分类映射（数据库ID -> 显示名称）
  const categoryMapping: { [key: string]: string } = {
    'general': '行业茶水间',
    'business': '商务＆合作',
    'news': '黑榜曝光',
    'industry': '行业茶水间',
    'blacklist': '黑榜曝光'
  };

  // 从内容中提取图片URL（支持HTML和Markdown格式）
  const extractImagesFromContent = (content: string): string[] => {
    if (!content) return [];
    
    const urls: string[] = [];
    
    // 1. 提取HTML格式的图片: <img src="url" alt="alt">
    const htmlImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = htmlImgRegex.exec(content)) !== null) {
      const src = match[1];
      if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
        urls.push(src);
      }
    }
    
    // 2. 提取Markdown格式的图片: ![alt](url)
    const markdownImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    
    while ((match = markdownImgRegex.exec(content)) !== null) {
      const src = match[2];
      if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
        urls.push(src);
    }
    }
    
    return urls;
  };

  // 获取子版块统计信息
  const getSubforumStats = (categoryId: string): SubforumStats => {
    const stats = subforumStats[categoryId];
    return {
      totalPosts: stats?.totalPosts || 0,
      totalReplies: stats?.totalReplies || 0,
      latestPost: stats?.latestPost || '暂无帖子'
    };
  };


  // 加载今日在线用户
  const loadOnlineUsers = useCallback(async () => {
    try {
      const response = await userAPI.getTodayOnlineUsers();
      if (response.success && response.data) {
        setOnlineUsers(response.data.users || []);
        setTotalOnlineUsers(response.data.totalOnline || 0);
        debugLog('✅ 今日在线用户加载成功:', { 
          users: response.data.users.length, 
          total: response.data.totalOnline 
        });
      }
    } catch (error) {
      console.error('❌ 加载今日在线用户失败:', error);
      setOnlineUsers([]);
      setTotalOnlineUsers(0);
        }
  }, []);

  // 加载商家数据
  const loadMerchants = useCallback(async () => {
    try {
      // 商家API是公开的，不需要token
      const response = await fetch(buildApiUrl('/merchants'), {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          // 显示所有商家，最多6个（用于侧边栏显示）
          setMerchants(data.data.slice(0, 6));
        }
      } else {
        console.error('加载商家失败: HTTP', response.status);
      }
    } catch (error) {
      console.error('加载商家失败:', error);
      setMerchants([]);
    }
  }, []);

  // 加载黑榜数据
  const loadBlacklist = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/admin/blacklist/public'), {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          // 格式化黑榜数据：将数据库字段映射到前端需要的格式
          const formattedEntries = data.data
            .slice(0, 6) // 最多显示6条
            .map((entry: any) => {
              // 格式化曝光时间
              const date = new Date(entry.created_at);
              const year = date.getFullYear();
              const month = date.getMonth() + 1;
              const exposed_date = `${year}年${month}月曝光`;
              
              return {
                name: entry.name,
                description: entry.description,
                exposed_date: exposed_date,
                contact_info: entry.contact_info,
                report_source: entry.report_source
              };
            });
          
          setBlacklistEntries(formattedEntries);
        }
        }
      } catch (error) {
      console.error('加载黑榜失败:', error);
      setBlacklistEntries([]);
    }
  }, []);

  // 加载帖子统计信息
  const loadPostStats = useCallback(async () => {
    try {
      const stats = await forumAPI.getPostStats();
      setSubforumStats(stats || {});
    } catch (error) {
      console.error('加载帖子统计信息失败:', error);
      setSubforumStats({});
    }
  }, []);

  // 加载帖子数据
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await forumAPI.getPosts(currentPage, postsPerPage, selectedCategory === 'all' ? undefined : selectedCategory);
      debugLog('[DEBUG] ForumPage loadPosts 响应数据:', data);
      debugLog('[DEBUG] ForumPage loadPosts 数据类型:', typeof data, Array.isArray(data));
      
      // 增强容错：支持多种返回格式
      const postsArray = Array.isArray(data) 
        ? data 
        : (data?.posts || data?.data?.posts || []);
      
      if (Array.isArray(postsArray) && postsArray.length > 0) {
        // 确保is_sticky字段被正确转换为布尔值
        const processedPosts = postsArray.map((post, index) => {
          // 简化转换：1, true, '1' 都视为 true；0, false, '0', null, undefined 都视为 false
          const rawSticky = post.is_sticky;
          const isSticky = rawSticky === 1 || rawSticky === true || rawSticky === '1' || rawSticky === 'true';
          const rawLocked = post.is_locked;
          const isLocked = rawLocked === 1 || rawLocked === true || rawLocked === '1' || rawLocked === 'true';
          
          // 处理回复数量：后端返回 reply_count（数字），需要映射到 replies 数组
          const replyCount = post.reply_count || 0;
          const repliesArray = Array.isArray(post.replies) ? post.replies : (replyCount > 0 ? Array(replyCount).fill(null) : []);
          
          // 创建新对象，确保 is_sticky 和 is_locked 被正确设置为布尔值
          const processed = {
            ...post,
            is_sticky: Boolean(isSticky),
            is_locked: Boolean(isLocked),
            replies: repliesArray,
            reply_count: replyCount // 保留原始 reply_count 以便后续使用
          };
          
          return processed;
        });
        
        // 统计置顶帖子数量
        const stickyPosts = processedPosts.filter(p => p.is_sticky === true);
        setPosts(processedPosts);
        // 计算总页数（基于实际返回的帖子数量）
        const total = data?.total || postsArray.length;
        setTotalPages(Math.max(1, Math.ceil(total / postsPerPage)));
      } else {
        setPosts([]);
        setTotalPages(1);
      }
      } catch (error) {
      console.error('加载帖子失败:', error);
        setPosts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, currentPage, postsPerPage]);

  // 处理分页切换
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // 滚动到页面最顶部
    setTimeout(() => {
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }, 100); // 稍微延迟确保新内容已加载
  };

  useEffect(() => {
    loadPosts();
    loadPostStats();
    loadMerchants();
    loadBlacklist();
    loadOnlineUsers();
  }, [loadPosts, loadPostStats, loadMerchants, loadBlacklist, loadOnlineUsers]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 如果点击的不是菜单或菜单按钮，则关闭菜单
      if (!target.closest('.post-menu-container')) {
        setEditingPostId(null);
      }
    };

    if (editingPostId !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [editingPostId]);


  // 处理发帖
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // 检查是否选择了子版块
    if (!hasSelectedCategory || !newPost.category) {
      alert('请先选择子版块！');
      return;
    }
    
    try {
      // 将图片URLs添加到内容中
      let contentWithImages = newPost.content;
      if (newPostImages.length > 0) {
      const imageHtml = newPostImages.map((url, index) => 
        `<img src="${url}" alt="帖子图片 ${index + 1}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: block;" class="post-image" />`
      ).join('');
      contentWithImages = newPost.content + '\n\n' + imageHtml;
    }

        const response = await forumAPI.createPost(newPost.title, contentWithImages, newPost.category);
        setNewPost({ title: '', content: '', category: '' });
        setNewPostImages([]);
        setShowPostForm(false); // 关闭发帖表单
        await loadPosts();
        await loadPostStats(); // 刷新统计
        
        // 后端已自动增加积分，刷新用户信息以获取最新积分
        if (refreshUserData) {
          await refreshUserData();
        }
        
        // 显示积分奖励提醒（使用 Toast）
        if (user && response?.pointsAwarded) {
          const oldLevel = user.level;
          const newTotalPoints = (user.points || 0) + response.pointsAwarded;
          const newLevel = USER_LEVELS.slice().reverse().find(level => newTotalPoints >= level.minPoints);
          
          if (newLevel && newLevel.id !== oldLevel?.id) {
            setToast({ 
              visible: true, 
              message: `🎉 恭喜！帖子发布成功！\n您从 ${oldLevel?.name || '未知'} 升级到 ${newLevel.name}！\n获得 ${response.pointsAwarded} 积分奖励`, 
              type: 'levelup' 
            });
          } else {
            setToast({ 
              visible: true, 
              message: `✅ 帖子发布成功！\n获得 ${response.pointsAwarded} 积分奖励`, 
              type: 'success' 
            });
          }
        } else if (user) {
          // 如果后端没有返回积分信息，使用默认值
          const oldLevel = user.level;
          const newTotalPoints = (user.points || 0) + POINTS_SYSTEM.CREATE_POST;
          const newLevel = USER_LEVELS.slice().reverse().find(level => newTotalPoints >= level.minPoints);
          
          if (newLevel && newLevel.id !== oldLevel?.id) {
            setToast({ 
              visible: true, 
              message: `🎉 恭喜！帖子发布成功！\n您从 ${oldLevel?.name || '未知'} 升级到 ${newLevel.name}！\n获得 ${POINTS_SYSTEM.CREATE_POST} 积分奖励`, 
              type: 'levelup' 
            });
          } else {
            setToast({ 
              visible: true, 
              message: `✅ 帖子发布成功！\n获得 ${POINTS_SYSTEM.CREATE_POST} 积分奖励`, 
              type: 'success' 
            });
          }
        } else {
          setToast({ 
            visible: true, 
            message: '✅ 帖子发布成功！', 
            type: 'success' 
          });
        }
    } catch (error) {
      console.error('发帖失败:', error);
    }
  };

  // 处理删除帖子
  const handleDeletePost = async (postId: number) => {
    if (!confirm('确定要删除这条帖子吗？')) return;
    
    try {
      await forumAPI.deletePost(postId);
      await loadPosts();
      await loadPostStats(); // 刷新统计
    } catch (error) {
      console.error('删除帖子失败:', error);
      alert('删除帖子失败');
    }
  };

  // 处理切换子版块
  const handleChangeCategory = async (postId: number, newCategory: string) => {
    try {
      await forumAPI.updatePost(postId, { category: newCategory });
      await loadPosts();
      await loadPostStats(); // 刷新统计
      setEditingPostId(null);
    } catch (error) {
      console.error('切换子版块失败:', error);
      alert('切换子版块失败');
    }
  };

  // 处理置顶/取消置顶帖子（仅管理员）
  const handleToggleSticky = async (postId: number, currentSticky: boolean) => {
    if (!user?.isAdmin && !user?.is_admin) {
      alert('只有管理员可以置顶帖子');
      return;
    }
    
    if (!confirm(currentSticky ? '确定要取消置顶这条帖子吗？' : '确定要置顶这条帖子吗？')) {
      return;
    }
    
    try {
      const response = await forumAPI.updatePost(postId, { is_sticky: !currentSticky });
      console.log('置顶操作响应:', response);
      await loadPosts();
      await loadPostStats(); // 刷新统计
      setEditingPostId(null);
    } catch (error: any) {
      console.error('置顶操作失败:', error);
      const errorMessage = error?.message || error?.error || '置顶操作失败';
      alert(errorMessage);
    }
  };

  // 切换编辑状态
  const toggleEditMenu = (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (editingPostId === postId) {
      setEditingPostId(null);
    } else {
      setEditingPostId(postId);
    }
  };

  // 过滤帖子
  const filteredPosts = useMemo(() => {
    let filtered = posts;
    
    if (searchTerm) {
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [posts, searchTerm]);
      
  // 子版块配置（使用 useMemo 动态计算，依赖于统计数据）
  const subforums = useMemo(() => [
    {
      id: 'tea-room',
      title: '行业茶水间',
      description: '轻松聊天,分享日常',
      icon: Coffee,
      color: 'emerald',
      category: 'general',
      stats: getSubforumStats('general')
    },
    {
      id: 'business',
      title: '商务&合作',
      description: '商业机会和合作讨论',
      icon: Briefcase,
      color: 'blue',
      category: 'business',
      stats: getSubforumStats('business')
    },
    {
      id: 'blacklist',
      title: '黑榜曝光',
      description: '曝光不良商家,维护行业秩序',
      icon: AlertTriangle,
      color: 'red',
      category: 'news',
      stats: getSubforumStats('news')
    }
  ], [subforumStats]);

  return (
    <PageTransition>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ visible: false, message: '', type: 'info' })}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-radial dark:from-slate-700 dark:to-slate-900">

        {/* 主内容区域 */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-12 gap-4">
            {/* 左侧边栏 - 诚信商家 */}
            <div className="col-span-12 lg:col-span-3">
              <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-xl border border-gray-300 dark:border-white/20 p-4 smart-sticky">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">诚信商家</h3>
                  <Link to="/merchants" className="text-emerald-500 hover:text-emerald-400 text-sm transition-colors">查看全部</Link>
                </div>
                <div className="space-y-2">
                  {merchants.length === 0 ? (
                    <div className="text-center text-gray-600 dark:text-gray-400 text-sm py-8">暂无商家信息</div>
                  ) : (
                  merchants.slice(0, 6).map((merchant) => {
                    // 统一所有分类的联系方式颜色为绿色
                    const getContactColor = () => {
                      return 'text-emerald-400';
                    };
                    
                    // 根据类别确定卡片边框颜色
                    const getBorderColor = () => {
                      switch(merchant.category) {
                        case 'gold': return 'hover:border-emerald-500/30';
                        case 'advertiser': return 'hover:border-purple-500/30';
                        default: return 'hover:border-blue-500/30';
                      }
                    };
                    
                    return (
                      <div 
                        key={merchant.id} 
                        className={`bg-white/90 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-lg p-3 transition-colors cursor-pointer border border-gray-200 dark:border-white/10 ${getBorderColor()}`}
                      >
                <div>
                          <h4 className="text-gray-900 dark:text-white font-semibold mb-1.5 text-sm">{merchant.name}</h4>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {merchant.description || 
                             (merchant.category === 'gold' ? '金牌服务商 - 优质体育用品供应' :
                              merchant.category === 'advertiser' ? '广告商 - 专业品牌推广' : '服务商 - 专业体育服务')}
                          </p>
                          {(() => {
                            // 提取emoji和联系方式
                            const contactInfo = merchant.contact_info || '';
                            
                            // 检查是否以特定emoji开头
                            let emoji = '📧';
                            let contactText = contactInfo;
                            
                            if (contactInfo.startsWith('📧')) {
                              emoji = '📧';
                              contactText = contactInfo.substring(2);
                            } else if (contactInfo.startsWith('✈️')) {
                              emoji = '✈️';
                              contactText = contactInfo.substring(2);
                            } else if (contactInfo.startsWith('🐧')) {
                              emoji = '🐧';
                              contactText = contactInfo.substring(2);
                            } else if (contactInfo.startsWith('🌍')) {
                              emoji = '🌍';
                              contactText = contactInfo.substring(2);
                            }
                            
                            return (
                              <div className={`flex items-center ${getContactColor()} text-sm mb-2`}>
                                <span className="mr-1 text-base">{emoji}</span>
                                <span className="force-italic">{contactText || '暂无联系方式'}</span>
                </div>
                            );
                          })()}
              </div>
                      </div>
                    );
                  }))}
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4 pt-3 border-t border-gray-200 dark:border-white/10">
                    共 {merchants.length} 家诚信商家
                </div>
            </div>
          </div>
        </div>

            {/* 中间内容区域 */}
            <div className="col-span-12 lg:col-span-6">
            {/* 子版块选择 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {subforums.map((subforum) => {
                  const IconComponent = subforum.icon;
                  
                  // 定义每个子版块的颜色主题
                  const getCardColors = () => {
                    switch(subforum.color) {
                      case 'emerald':
                        return {
                          bg: selectedCategory === subforum.category 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500 border-emerald-500/50' 
                            : 'bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20',
                          iconBg: selectedCategory === subforum.category
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-600 dark:text-emerald-400'
                            : 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400',
                          hoverText: 'text-emerald-600 dark:text-emerald-500'
                        };
                      case 'blue':
                        return {
                          bg: selectedCategory === subforum.category 
                            ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 border-blue-500/50' 
                            : 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20',
                          iconBg: selectedCategory === subforum.category
                            ? 'bg-blue-500/20 border-blue-400 text-blue-600 dark:text-blue-400'
                            : 'bg-blue-500/10 border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400',
                          hoverText: 'text-blue-600 dark:text-blue-500'
                        };
                      case 'red':
                        return {
                          bg: selectedCategory === subforum.category 
                            ? 'bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500 border-red-500/50' 
                            : 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20',
                          iconBg: selectedCategory === subforum.category
                            ? 'bg-red-500/20 border-red-400 text-red-600 dark:text-red-400'
                            : 'bg-red-500/10 border-red-300 dark:border-red-600 text-red-600 dark:text-red-400',
                          hoverText: 'text-red-600 dark:text-red-500'
                        };
                      default:
                        return {
                          bg: 'bg-gray-100 dark:bg-slate-800/70 border-gray-200 dark:border-slate-600/50',
                          iconBg: 'bg-gray-300 dark:bg-slate-600/50 border-gray-400 dark:border-slate-500/50 text-gray-600 dark:text-slate-400',
                          hoverText: 'text-gray-700 dark:text-gray-400'
                        };
                    }
                  };
                  
                  const colors = getCardColors();
                  
                  return (
                    <button
                      key={subforum.id}
                      onClick={() => {
                        // 如果点击的是已选中的子版块，则取消选择（恢复到显示全部）
                        if (selectedCategory === subforum.category) {
                          updateCategorySelection('all');
                        } else {
                          updateCategorySelection(subforum.category);
                        }
                      }}
                      className={`${colors.bg} backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-600/50 p-4 h-64 flex flex-col justify-between transition-all duration-300 cursor-pointer group ${
                        selectedCategory === subforum.category ? 'shadow-lg' : 'hover:shadow-lg'
                      }`}
                    >
                        <div className="text-center">
                        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 border transition-colors ${colors.iconBg}`}>
                          <IconComponent className="w-5 h-5" />
                          </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">{subforum.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">{subforum.description}</p>
                        </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-400">帖子数</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{subforum.stats.totalPosts}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-400">回复数</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{subforum.stats.totalReplies}</span>
                      </div>
                        <div className="text-xs text-gray-600 dark:text-gray-500">最新: {subforum.stats.latestPost}</div>
                      </div>
                      <div className={`flex items-center justify-center space-x-2 text-sm mt-4 opacity-0 group-hover:opacity-100 transition-opacity font-medium ${colors.hoverText}`}>
                        <span>点击切换</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                    </div>
                    </button>
                  );
                })}
              </div>

            {/* 发帖表单 */}
              {user && showPostForm && (
                <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/20 p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">发布新帖子</h3>
                      <span className="text-gray-900 dark:text-white mx-2">到</span>
                    <button
                      type="button"
                      onClick={togglePostCategory}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all duration-200 text-sm font-medium flex items-center hover:scale-105"
                      >
                        <span>{selectedCategoryName}</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowPostForm(false)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="关闭"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button
                        type="submit"
                        form="post-form"
                        disabled={!hasSelectedCategory || !newPost.category}
                        className={`px-6 py-2 rounded-lg transition-colors font-semibold ${
                          !hasSelectedCategory || !newPost.category
                            ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        确认发布
                    </button>
                  </div>
                </div>
                      
                  <form id="post-form" onSubmit={handleCreatePost} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-2">帖子标题</label>
                        <input
                        type="text"
                        value={newPost.title}
                        onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="输入帖子标题..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-2">帖子内容</label>
                      <SimpleTextEditor
                        value={newPost.content}
                        onChange={(content) => setNewPost(prev => ({ ...prev, content }))}
                        placeholder="分享你的想法..."
                        rows={6}
                      />
                      
                      {/* 工具栏 */}
                      <div className="flex items-center space-x-2 mt-2">
                        {/* 表情包按钮 */}
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          title="添加表情"
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        
                        {/* 图片按钮 */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          title="上传图片"
                        >
                          <Image className="w-5 h-5" />
                        </button>
                        
                        {/* 隐藏的文件输入 */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleDirectImageUpload}
                          className="hidden"
                        />
                        
                        {/* @按钮 */}
                        <button
                          type="button"
                          onClick={addMention}
                          className="p-2 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          title="@用户"
                        >
                          <AtSign className="w-5 h-5" />
                        </button>
                                    </div>
                      
                      {/* 表情包选择器 */}
                      {showEmojiPicker && (
                        <div className="mt-3 p-3 bg-white dark:bg-white/10 rounded-lg border border-gray-200 dark:border-white/20">
                          <div className="grid grid-cols-8 gap-2">
                            {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => addEmoji(emoji)}
                                className="p-2 text-2xl hover:bg-gray-100 dark:hover:bg-white/20 rounded transition-colors"
                              >
                                {emoji}
                              </button>
                          ))}
                          </div>
                        </div>
                  )}
                      
                      {/* 图片预览 */}
                      {newPostImages.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-800 dark:text-gray-300">已上传 {newPostImages.length}/9 张图片</span>
                </div>
                          <div className="grid grid-cols-3 gap-3">
                            {newPostImages.map((url, index) => (
                              <div key={index} className="relative group">
                                <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
                                  <img
                                    src={url}
                                    alt={`上传的图片 ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
              </div>
                    
                                {/* 删除按钮 */}
                      <button
                                  type="button"
                                  onClick={() => setNewPostImages(newPostImages.filter((_, i) => i !== index))}
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                                  <X className="w-3 h-3" />
                      </button>
                    </div>
                            ))}
                          </div>
                        </div>
                      )}
            </div>
                </form>
              </div>
            )}

                {/* 最新帖子 */}
              <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/20 p-4">
                <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">最新帖子</h2>
                  {!showPostForm && (
                  <button 
                      onClick={() => setShowPostForm(!showPostForm)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-semibold hover:scale-105 shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>发布新帖子</span>
                    </button>
                    )}
                  </div>


                {/* 帖子列表 */}
        <div ref={postsContainerRef} className="space-y-3">
                    {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="loading-spinner"></div>
                </div>
                  ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-8 text-gray-700 dark:text-gray-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无帖子，快来发布第一个帖子吧！</p>
                  </div>
                ) : (
                    filteredPosts.map((post) => (
                      <div 
                        key={post.id} 
                        className={`bg-white dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/10 p-4 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors relative cursor-pointer ${editingPostId === post.id ? 'z-[100]' : 'z-auto'}`}
                        onClick={() => navigate(`/forum/post/${post.id}`)}
                      >
                        {/* 置顶标识 - 参考主流网站设计：标题旁标签 + 背景高亮 */}
                        {post.is_sticky === true && (
                          <>
                            {/* 背景高亮 - 柔和的emerald色背景 */}
                            <div className="absolute inset-0 bg-emerald-50/50 dark:bg-emerald-900/10 border-l-2 border-emerald-500 rounded-lg -z-0" />
                            {/* 右上角横向拉长的切角 + 明显的pin标识 */}
                            <div 
                              className="absolute top-0 right-0 z-10"
                              style={{
                                width: '120px',
                                height: '40px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.9) 100%)',
                                clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
                                boxShadow: '0 2px 12px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                              }}
                            >
                              <div className="absolute top-2 right-3 flex items-center justify-center">
                                <Pin className="w-5 h-5 text-white drop-shadow-lg" fill="white" strokeWidth={2.5} />
                              </div>
                            </div>
                          </>
                        )}
                        {/* 管理齿轮图标 - 仅作者或管理员可见 */}
                        {((user?.isAdmin || user?.is_admin) || user?.id === (post.author_id || post.author?.id)) && (
                          <div className="absolute top-4 right-4 z-[50] post-menu-container">
                            <button 
                                onClick={(e) => {
                                toggleEditMenu(post.id, e);
                              }}
                              className="p-2 rounded-full bg-gray-200 dark:bg-gray-800/80 hover:bg-gray-300 dark:hover:bg-gray-700/80 text-gray-800 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" 
                              title="管理帖子"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            
                            {/* 管理菜单 */}
                            {editingPostId === post.id && (
                              <div className="absolute top-10 right-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 min-w-[200px] py-2 z-[50]">
                                <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-600">
                                  选择子版块
                                </div>
                                <button
                                  onClick={(e) => {
                                  e.stopPropagation();
                                    handleChangeCategory(post.id, 'general');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-emerald-600 dark:text-emerald-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                  行业茶水间
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChangeCategory(post.id, 'business');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                  商务&合作
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChangeCategory(post.id, 'news');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                  黑榜曝光
                                </button>
                                <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
                                {/* 置顶帖子 - 仅管理员可见 */}
                                {(user?.isAdmin || user?.is_admin) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleSticky(post.id, post.is_sticky || false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center space-x-2"
                                  >
                                    {post.is_sticky ? (
                                      <>
                                        <PinOff className="w-4 h-4" />
                                        <span>取消置顶</span>
                                      </>
                                    ) : (
                                      <>
                                        <Pin className="w-4 h-4" />
                                        <span>置顶帖子</span>
                                      </>
                                    )}
                                  </button>
                                )}
                                <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePost(post.id);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                >
                                  删除帖子
                                </button>
                              </div>
                            )}
                                    </div>
                              )}
                              
                        <div className="flex items-start space-x-3 group">
                          <div 
                                className="cursor-pointer hover:scale-105 transition-transform"
                            title={`点击查看 ${post.author} 的用户信息`}
                            onClick={(e) => e.stopPropagation()}
                              >
                                <UserAvatar 
                              username={post.author}
                              size="md"
                              className="w-12 h-12"
                                />
                              </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {post.author}
                              </span>
                              {(() => {
                                const userLevel = post.author_points ? getUserLevel(post.author_points) : USER_LEVELS[0];
                                return (
                                  <span 
                                    className="text-xs px-2 py-1 rounded-full text-white"
                                    style={{ backgroundColor: `${userLevel.color}40`, color: userLevel.color }}
                                  >
                                    {userLevel.name}
                                  </span>
                                );
                              })()}
                              <span className="text-gray-600 dark:text-gray-400 text-xs">{formatTimeAgo(post.timestamp)}</span>
                                </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-lg font-semibold text-gray-900 dark:text-white hover:text-emerald-400 dark:hover:text-emerald-400">
                                {post.title}
                              </div>
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                              <HtmlContent content={fixImageUrlsInContent(post.content)} hideImages={true} />
                            </div>
                            
                            {/* 帖子图片预览 - 使用原有的PostImageGallery组件 */}
                            <div className="mb-3">
                                      <PostImageGallery 
                                images={extractImagesFromContent(post.content)}
                                maxPreviewImages={3}
                                className="mt-1"
                                  />
                                </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 text-sm">
                                <span className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800/50 px-3 py-1 rounded-full text-gray-700 dark:text-gray-300">
                                        <MessageSquare className="w-4 h-4" />
                                  <span className="font-medium">{(post.reply_count !== undefined ? post.reply_count : (post.replies?.length || 0))} 条回复</span>
                                      </span>
                                    </div>
                                    {(() => {
                                      const categoryName = categoryMapping[post.category] || '其他';
                                      
                                      // 根据类别确定颜色
                                      let colorClass = 'slate';
                                      if (categoryName === '行业茶水间') {
                                        colorClass = 'emerald';
                                      } else if (categoryName === '商务＆合作' || categoryName === '商务&合作') {
                                        colorClass = 'blue';
                                      } else if (categoryName === '黑榜曝光') {
                                        colorClass = 'red';
                                      }
                                      
                                      return (
                                        <span className={`text-${colorClass}-400 text-xs bg-${colorClass}-500/20 px-2 py-1 rounded-full`}>
                                          {categoryName}
                                    </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                                  </div>
                                    </div>
                    ))
                                    )}
                                  
                  {/* 分页组件 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center mt-8 space-x-2">
                                <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                        上一页
                                </button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                currentPage === page
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                                  </div>
                      
                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                        下一页
                      </button>
                    </div>
                  )}
                                  </div>
              </div>
            </div>

            {/* 右侧边栏 */}
            <div className="col-span-12 lg:col-span-3">
              <div className="space-y-4 smart-sticky">
                {/* 黑榜曝光 */}
                <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-xl border border-gray-300 dark:border-white/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">黑榜曝光</h3>
                    <Link to="/blacklist" className="text-red-400 hover:text-red-300 text-sm transition-colors">查看全部</Link>
                                        </div>
                  <div className="space-y-2">
                    {blacklistEntries.length > 0 ? (
                      blacklistEntries.slice(0, 6).map((entry, index) => (
                        <div key={index} className="relative bg-white/90 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-lg p-3 transition-colors cursor-pointer border border-gray-200 dark:border-white/10 hover:border-red-500/30">
                          {/* 右上角手写体盖章 */}
                          <span className={`absolute top-2 right-2 border px-3 py-1 rounded rotate-[10deg] text-sm font-bold ${entry.report_source === 'platform' ? 'text-red-400/80 border-red-400/60' : 'text-blue-400/80 border-blue-400/60'}`} style={{ fontFamily: 'cursive' }}>
                            {entry.report_source === 'platform' ? '官方核实' : '用户举报'}
                                    </span>
                          <div>
                            <h4 className="text-gray-900 dark:text-white font-semibold mb-1.5 text-sm">{entry.name}</h4>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                              {entry.description}
                            </p>
                            {(() => {
                              const contactInfo = entry.contact_info || '';
                              let emoji = '📧';
                              let text = contactInfo;
                              if (contactInfo.startsWith('📧')) { emoji = '📧'; text = contactInfo.substring(2); }
                              else if (contactInfo.startsWith('✈️')) { emoji = '✈️'; text = contactInfo.substring(2); }
                              else if (contactInfo.startsWith('🐧')) { emoji = '🐧'; text = contactInfo.substring(2); }
                              else if (contactInfo.startsWith('🌍')) { emoji = '🌍'; text = contactInfo.substring(2); }
                              return contactInfo ? (
                                <div className="flex items-center text-red-400 text-sm mb-2">
                                  <span className="mr-1 text-base">{emoji}</span>
                                  <span className="force-italic">{text}</span>
                                  </div>
                              ) : null;
                            })()}
                            <div className="flex items-center justify-end text-sm text-gray-400">
                              <span>{entry.exposed_date}</span>
                                    </div>
                                </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-400">暂无黑榜信息</p>
                                      </div>
                                    )}
                    {blacklistEntries.length > 0 && (
                      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4 pt-3 border-t border-gray-200 dark:border-white/10">
                        共 {blacklistEntries.length} 条曝光记录
                      </div>
                                    )}
                                  </div>
                                </div>
                                
                {/* 当前在线 */}
                <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/20 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">当前在线</h3>
                  <div className="space-y-2">
                    {onlineUsers.length > 0 ? (
                      onlineUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-3">
                          <RealTimeAvatar 
                            user={user} 
                              size="sm"
                              className="w-8 h-8"
                                          />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                // 胶囊显示，与用户卡片一致
                                const renderPill = (label: string) => (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" key={label}>
                                    {label}
                                  </span>
                                );

                                // 优先 roles 数组（按 id 匹配 INDUSTRY_ROLES）
                                if (Array.isArray(user.roles) && user.roles.length > 0) {
                                  const labels = user.roles
                                    .map((rid: string) => INDUSTRY_ROLES.find(r => r.id === rid)?.label)
                                    .filter(Boolean) as string[];
                                  if (labels.length > 0) return labels.slice(0, 3).map(renderPill);
                                }

                                // 其次 role 文本（做容错映射）
                                if (user.role) {
                                  const s = (user.role || '').toString().trim().toLowerCase();
                                  const dict: Record<string, string> = {
                                    '主播': '主播', 'anchor': '主播', 'streamer': '主播',
                                    '甲方': '甲方', 'party a': '甲方', 'partya': '甲方', 'party_a': '甲方', 'client': '甲方', '客户': '甲方',
                                    '服务商': '服务商', 'service': '服务商', 'provider': '服务商', 'vendor': '服务商',
                                    '其他': '其他', 'other': '其他', 'user': '其他', '普通用户': '其他'
                                  };
                                  const label = dict[s] || dict[s.replace(/\s+/g, '')] || '其他';
                                  return renderPill(label);
                                    }

                                return renderPill('其他');
                                  })()}
                                </div>
                                </div>
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-600 dark:text-gray-400 text-sm py-4">
                        暂无在线用户
                          </div>
                    )}
                    <div className="text-center text-xs text-gray-500 dark:text-gray-500 mt-2">
                      共 {totalOnlineUsers} 人在线
                        </div>
                      </div>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* 移动端发帖按钮 */}
        {user && (
          <button 
            onClick={() => navigate('/forum/new', { state: { from: '/forum' } })}
            className="fixed bottom-6 right-6 md:hidden w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all duration-200 flex items-center justify-center hover:scale-110"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}


        {/* Token清理组件 */}
        {showTokenCleaner && <TokenCleaner />}
      </div>
    </PageTransition>
  );
};

export default ForumPage;
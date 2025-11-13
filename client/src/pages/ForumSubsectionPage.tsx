import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, MessageSquare, Eye, Calendar, Clock, ArrowLeft, Coffee, Briefcase, AlertTriangle, Heart, Pin } from 'lucide-react';
import UserLevelBadge from '../components/UserLevelBadge';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import UserProfileModal from '../components/UserProfileModal';
import { formatTimeAgo } from '../utils/userUtils';
import { fixImageUrlsInContent } from '../utils/imageUtils';
import HtmlContent from '../components/HtmlContent';

const ForumSubsectionPage: React.FC = () => {
  const { subsection } = useParams<{ subsection: string }>();
  const { user, getForumPosts } = useAuth();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);

  // 加载帖子数据
  useEffect(() => {
    const load = async () => {
      try {
        const loadedPosts = await getForumPosts();
        setPosts(loadedPosts || []);
      } catch (e) {
        setPosts([]);
      }
    };
    load();
  }, [getForumPosts, subsection]);
  
  const subsectionConfig = {
    'tea-room': {
      title: '行业茶水间',
      description: '轻松聊天，分享日常，建立行业人脉',
      icon: Coffee,
      color: 'emerald',
      category: 'general'
    },
    'business': {
      title: '商务＆合作',
      description: '商业合作，项目对接，经验分享',
      icon: Briefcase,
      color: 'blue',
      category: 'business'
    },
    'blacklist': {
      title: '黑榜曝光',
      description: '曝光不良商家，维护行业秩序',
      icon: AlertTriangle,
      color: 'red',
      category: 'news'
    }
  };

  const currentSection = subsectionConfig[subsection as keyof typeof subsectionConfig];
  
  if (!currentSection) {
    return <div>版块不存在</div>;
  }

  const IconComponent = currentSection.icon;
  
  // Filter posts by category and sort by latest activity (newest first)
  const filteredPosts = posts
    .filter(post => post.category === currentSection.category)
    .sort((a, b) => {
      // 获取最新活动时间：优先使用最新回复时间，否则使用帖子创建时间
      const getLatestActivity = (post: any) => {
        // 如果有回复，使用最新回复时间
        if (post.replies && post.replies.length > 0) {
          const latestReply = post.replies.reduce((latest: any, reply: any) => {
            const replyTime = new Date(reply.createdAt || reply.timestamp);
            const latestTime = new Date(latest.createdAt || latest.timestamp);
            return replyTime > latestTime ? reply : latest;
          });
          return new Date(latestReply.createdAt || latestReply.timestamp);
        }
        
        // 否则使用帖子时间
        return new Date(post.createdAt || post.timestamp);
      };
      
      const aTime = getLatestActivity(a);
      const bTime = getLatestActivity(b);
      
      return bTime.getTime() - aTime.getTime();
    });

  const handleUserClick = (postUser: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedUser(postUser);
    setIsProfileModalOpen(true);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-radial from-slate-700 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center mb-8 stagger-children">
            <Link
              to="/forum"
              className="flex items-center text-gray-300 hover:text-emerald-400 transition-colors mr-4"
              style={{ '--stagger-delay': '1' } as React.CSSProperties}
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              返回论坛
            </Link>
            <div className="flex items-center space-x-3" style={{ '--stagger-delay': '2' } as React.CSSProperties}>
              <IconComponent className={`w-8 h-8 text-${currentSection.color}-400`} />
              <div>
                <h1 className="text-3xl font-bold text-white">{currentSection.title}</h1>
                <p className="text-gray-300">{currentSection.description}</p>
              </div>
            </div>
            <div className="ml-auto" style={{ '--stagger-delay': '3' } as React.CSSProperties}>
              <Link
                to="/forum/new"
                state={{ 
                  from: `/forum/${subsection}`, 
                  category: currentSection.category 
                }}
                className="inline-flex items-center bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                发布新帖
              </Link>
            </div>
          </div>

          {/* Posts List - Compact Design */}
          <div className="space-y-3 stagger-children">
            {filteredPosts.map((post, index) => (
              <Link
                to={`/forum/post/${String(post.id)}`}
                key={post.id}
                className="block bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 hover:border-emerald-400 transition-all duration-300 hover:bg-white/15"
                style={{ '--stagger-delay': `${4 + index}` } as React.CSSProperties}
              >
                <div className="w-full">
                  
                  <div className="flex items-center space-x-2 mb-3">
                      <span className="text-xs bg-white/20 text-gray-300 px-2 py-1 rounded">
                        {currentSection.title}
                      </span>
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(post.timestamp)}
                      </span>
                      {post.replies && post.replies.length > 0 && (
                        <>
                          <MessageSquare className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs text-emerald-400">
                            {formatTimeAgo(post.replies[post.replies.length - 1].createdAt)}
                          </span>
                        </>
                      )}
                  </div>
                    
                  <div className="flex items-center space-x-2 mb-3">
                    <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {post.title}
                    </h3>
                    {/* 置顶标识 */}
                    {post.is_sticky && (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <Pin className="w-3 h-3" />
                        <span>置顶</span>
                      </span>
                    )}
                  </div>
                    
                  <div className="text-gray-300 text-sm mb-4 line-clamp-2 leading-relaxed">
                    <HtmlContent 
                      content={post.content || ''} 
                      className="post-preview"
                    />
                  </div>
                    
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={(e) => {
                          const userObj = { username: post.author };
                          handleUserClick(userObj, e);
                        }}
                        className="w-6 h-6 bg-emerald-600/20 rounded-full flex items-center justify-center border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
                      >
                        <span className="text-emerald-400 text-xs font-semibold">
                          {post.author ? post.author.charAt(0) : '?'}
                        </span>
                      </button>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            const userObj = { username: post.author };
                            handleUserClick(userObj, e);
                          }}
                          className="text-xs text-gray-200 hover:text-emerald-400 transition-colors"
                        >
                          {post.author}
                        </button>
                      </div>
                    </div>
                      
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{Math.floor(Math.random() * 500) + 100}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="w-3 h-3" />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{(post.replies && post.replies.length) || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(post.timestamp).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <IconComponent className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">暂无讨论</h3>
                <p className="text-gray-300">成为第一个在此版块发帖的用户吧！</p>
                <Link
                  to="/forum/new"
                  state={{ 
                    from: `/forum/${subsection}`, 
                    category: currentSection.category 
                  }}
                  className="inline-flex items-center bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  发布新帖
                </Link>
              </div>
            )}
          </div>

          {/* Pagination placeholder */}
          {filteredPosts.length > 0 && (
            <div className="flex justify-center mt-8" style={{ '--stagger-delay': '8' } as React.CSSProperties}>
              <div className="flex space-x-2">
                <button className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-gray-300 hover:bg-white/20 transition-colors text-sm">
                  上一页
                </button>
                <button className="px-3 py-2 bg-emerald-600 text-white rounded-md font-medium text-sm">
                  1
                </button>
                <button className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-gray-300 hover:bg-white/20 transition-colors text-sm">
                  2
                </button>
                <button className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-gray-300 hover:bg-white/20 transition-colors text-sm">
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Modal */}
        {selectedUser && (
          <UserProfileModal
            user={selectedUser}
            isOpen={isProfileModalOpen}
            onClose={() => {
              setIsProfileModalOpen(false);
              setSelectedUser(null);
            }}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default ForumSubsectionPage;
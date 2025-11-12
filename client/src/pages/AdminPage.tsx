import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { showUserCard, hideUserCard } from '../components/UserHoverCard';
import { 
  Users, 
  Bot, 
  Plus, 
  Shield, 
  Store, 
  AlertTriangle,
  Edit,
  Eye,
  EyeOff,
  Globe,
  Check,
  X as XIcon,
  Search,
  TrendingUp,
  UserPlus,
  MessageSquare,
  Activity
} from 'lucide-react';
import { mockUsers } from '../data/mockData';
import { User } from '../types';
import { getUserLevel } from '../utils/userUtils';
import { INDUSTRY_ROLES } from '../data/constants';

const AdminPage: React.FC = () => {
  console.log('🔍 [AdminPage] 组件渲染');
  const { user, getBotAccounts, addBotAccounts, updateBotAccount, getForumPosts } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'bots' | 'merchants' | 'blacklist'>('users');
  const [createdAccounts, setCreatedAccounts] = useState<any[]>([]);
  const [isCreatingAccounts, setIsCreatingAccounts] = useState(false);
  const [accountCount, setAccountCount] = useState(10);
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [editingBot, setEditingBot] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    points: 0,
    roles: [] as string[]
  });
  
  // 用户管理相关状态
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [websiteStats, setWebsiteStats] = useState({
    dailyNewUsers: 0,
    onlineUsers: 0,
    totalPosts: 0,
    dailyNewPosts: 0
  });
  
  
  // 统一带上Authorization的fetch（与AdminDashboard一致）
  const authFetch = async (input: RequestInfo, init: RequestInit = {}) => {
    const token = localStorage.getItem('oldksports_auth_token') || localStorage.getItem('access_token');
    const headers = new Headers(init.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers, credentials: 'include' });
  };

  // 加载所有用户数据
  const loadAllUsers = async () => {
    console.log('🔍 [AdminPage] loadAllUsers 开始执行');
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || '/api'}/admin/users`;
      console.log('🔍 [AdminPage] 请求URL:', apiUrl);
      const res = await authFetch(apiUrl);
      console.log('🔍 [AdminPage] API响应状态:', res.status, res.ok);
      
      if (res.ok) {
        const data = await res.json();
        console.log('🔍 [AdminPage] API返回数据:', data);
        console.log('🔍 [AdminPage] data.success:', data.success, 'data.data是数组:', Array.isArray(data.data));
        if (data.success && Array.isArray(data.data)) {
          console.log('🔍 [AdminPage] 用户数量:', data.data.length);
          if (data.data.length > 0) {
            console.log('🔍 [AdminPage] 第一个用户数据:', data.data[0]);
            console.log('🔍 [AdminPage] 第一个用户的last_login:', data.data[0].last_login);
            console.log('🔍 [AdminPage] 第一个用户的points:', data.data[0].points, '类型:', typeof data.data[0].points);
          }
          const usersFromApi: User[] = data.data.map((u: any) => {
            // 确保points是数字类型，处理null、undefined、字符串等情况
            let points = 0;
            if (u.points !== null && u.points !== undefined) {
              const parsedPoints = typeof u.points === 'string' ? parseInt(u.points, 10) : Number(u.points);
              points = isNaN(parsedPoints) ? 0 : parsedPoints;
            }
            const level = getUserLevel(points);
            
            // 处理 last_login 字段
            let lastLogin: Date | null = null;
            if (u.last_login) {
              const dateValue = new Date(u.last_login);
              if (!isNaN(dateValue.getTime())) {
                lastLogin = dateValue;
              }
            }
            
            return {
              id: u.id,
              username: u.username,
              email: u.email,
              points,
              level,
              joinDate: u.join_date ? new Date(u.join_date) : (u.created_at ? new Date(u.created_at) : new Date()),
              hasUploadedAvatar: !!u.avatar,
              avatar: u.avatar || null,
              isAdmin: !!u.is_admin,
              roles: u.roles || [],
              lastLogin: lastLogin,
              ipAddress: u.last_login_ip || u.register_ip || '未知'
            } as User;
          });
          
          console.log('🔍 [AdminPage] 处理后的用户数据数量:', usersFromApi.length);
          console.log('🔍 [AdminPage] 第一个处理后的用户:', usersFromApi[0]);
          setAllUsers(usersFromApi);
          setFilteredUsers(usersFromApi);
          console.log('🔍 [AdminPage] 状态已更新，allUsers和filteredUsers已设置');
          return;
        } else {
          console.warn('🔍 [AdminPage] API返回数据格式不正确:', data);
        }
      } else {
        console.warn('🔍 [AdminPage] API请求失败，状态码:', res.status);
      }
    } catch (e) {
      console.error('🔍 [AdminPage] 获取用户列表失败:', e);
    }

    // 回退数据
    const botAccounts = getBotAccounts();
    const mockUsersData = mockUsers.filter(u => u.username !== 'oldk');
    const registeredUsers = getRegisteredUsers();
    const combinedUsers = [...mockUsersData, ...botAccounts, ...registeredUsers];
    setAllUsers(combinedUsers);
    setFilteredUsers(combinedUsers);
  };

  // 获取注册用户（从localStorage）
  const getRegisteredUsers = (): User[] => {
    const registeredUsers: User[] = [];
    // 这里可以添加从localStorage获取注册用户的逻辑
    // 目前暂时返回空数组，因为注册用户存储在各自的localStorage中
    return registeredUsers;
  };

  // 加载所有用户数据和网站统计
  useEffect(() => {
    console.log('🔍 [AdminPage] useEffect 执行，开始加载用户数据');
    loadAllUsers();
    loadWebsiteStats();
    
    const bots = getBotAccounts();
    setCreatedAccounts(bots);
  }, []); // 移除依赖项，确保只在组件挂载时执行一次

  // 加载网站统计数据
  const loadWebsiteStats = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || '/api'}/admin/dashboard/stats`;
      const res = await authFetch(apiUrl);
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setWebsiteStats({
            dailyNewUsers: data.data.todayUsers || 0,
            onlineUsers: data.data.onlineUsers || 0,
            totalPosts: data.data.totalPosts || 0,
            dailyNewPosts: data.data.todayPosts || 0
          });
          return;
        }
      }
      
      // 如果API请求失败，使用默认值
      console.warn('获取网站统计数据失败，使用默认值');
      setWebsiteStats({
        dailyNewUsers: 0,
        onlineUsers: 0,
        totalPosts: 0,
        dailyNewPosts: 0
      });
    } catch (error) {
      console.error('加载网站统计数据失败:', error);
      setWebsiteStats({
        dailyNewUsers: 0,
        onlineUsers: 0,
        totalPosts: 0,
        dailyNewPosts: 0
      });
    }
  };

  // 搜索用户
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  
  // 检查管理员权限
  if (!user?.isAdmin) {
    return <Navigate to="/admin-login" replace />;
  }

  const handleCreateAccounts = async () => {
    setIsCreatingAccounts(true);
    
    // 体育相关随机名字生成器
    const sportsUsernames = [
      '不看球的小李', '大力射门', '精准三分球', '大风侃球', '足球小王子',
      '篮球迷阿强', '体育解说员', '运动达人', '球评专家', '赛场老炮',
      '体育评论员', '球迷老王', '运动健将', '足球解说', '篮球高手',
      '体育主播', '球场老手', '运动爱好者', '球赛分析师', '体育记者',
      '足球教练', '篮球裁判', '运动达人', '体育作家', '球评达人',
      '赛场观察员', '体育专家', '球迷领袖', '运动健儿', '球坛老手',
      '足球明星', '篮球传奇', '体育名人', '运动先锋', '球评大师',
      '体育评论家', '球迷代表', '运动冠军', '球坛新秀', '体育达人'
    ];
    
    // 随机选择行业角色
    const getRandomRoles = () => {
      const shuffled = [...INDUSTRY_ROLES].sort(() => 0.5 - Math.random());
      const selectedCount = Math.floor(Math.random() * 3) + 1; // 1-3个角色
      return shuffled.slice(0, selectedCount).map(role => role.id);
    };
    
    // 模拟批量创建账号
    setTimeout(() => {
      const newAccounts = Array.from({ length: accountCount }, (_, i) => {
        const randomUsername = sportsUsernames[Math.floor(Math.random() * sportsUsernames.length)];
        const randomNumber = Math.floor(Math.random() * 10000);
        const uniqueUsername = `${randomUsername}${randomNumber}`;
        const randomPoints = Math.floor(Math.random() * 2000) + 100; // 100-2100积分
        
        return {
          id: Date.now() + i,
          username: uniqueUsername,
          email: `${randomNumber}@temp.com`,
          password: 'Kk19941030',
          points: randomPoints,
          level: getUserLevel(randomPoints),
          joinDate: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)), // 随机加入时间（过去一年内）
          lastLogin: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)), // 最近7天内登录
          roles: getRandomRoles(),
          hasUploadedAvatar: Math.random() > 0.7, // 30%概率有头像
          isAdmin: false,
          createdAt: new Date(),
          isBot: true
        } as User;
      });
      
      // 保存到AuthContext和本地状态
      addBotAccounts(newAccounts);
      setCreatedAccounts(prev => [...prev, ...newAccounts]);
      setIsCreatingAccounts(false);
      alert(`成功创建 ${accountCount} 个机器人账号！`);
    }, 2000);
  };

  const togglePasswordVisibility = (accountId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  // 机器人账号编辑函数
  const handleEditBot = (bot: any) => {
    setEditingBot(bot.id);
    // 确保 roles 是数组类型
    const safeRoles = Array.isArray(bot.roles) ? bot.roles : [];
    setEditForm({
      username: bot.username,
      points: bot.points,
      roles: [...safeRoles]
    });
  };

  const handleSaveBot = () => {
    if (editingBot) {
      const updatedBot = {
        username: editForm.username,
        points: editForm.points,
        level: getUserLevel(editForm.points),
        roles: editForm.roles
      };
      
      // 更新AuthContext中的数据
      updateBotAccount(editingBot, updatedBot);
      
      // 更新本地状态
      setCreatedAccounts(prev => 
        prev.map(bot => 
          bot.id === editingBot 
            ? { ...bot, ...updatedBot }
            : bot
        )
      );
      
      setEditingBot(null);
      alert('机器人账号信息更新成功！');
    }
  };

  const handleCancelEdit = () => {
    setEditingBot(null);
    setEditForm({
      username: '',
      points: 0,
      roles: []
    });
  };

  const handleRoleToggle = (roleId: string) => {
    setEditForm(prev => {
      // 确保 roles 始终是数组类型
      const safeRoles = Array.isArray(prev.roles) ? prev.roles : [];
      return {
        ...prev,
        roles: safeRoles.includes(roleId)
          ? safeRoles.filter(r => r !== roleId)
          : [...safeRoles, roleId]
      };
    });
  };

  const tabs = [
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'bots', label: '机器人账号', icon: Bot },
    { id: 'merchants', label: '优秀商家', icon: Store },
    { id: 'blacklist', label: '曝光黑榜', icon: AlertTriangle }
  ];

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center border border-red-500/30">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-on-surface">管理员后台</h1>
              <p className="text-on-surface-variant">系统管理和内容维护</p>
            </div>
          </div>
          
          <div className="text-sm text-on-surface-tertiary">
            管理员：{user.username}
          </div>
        </div>

        {/* Website Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface-variant/10 backdrop-blur-sm rounded-lg border border-surface/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-on-surface-variant mb-1">今日新增用户</p>
                <p className="text-2xl font-bold text-emerald-400">{websiteStats.dailyNewUsers}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-surface-variant/10 backdrop-blur-sm rounded-lg border border-surface/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-on-surface-variant mb-1">在线用户</p>
                <p className="text-2xl font-bold text-blue-400">{websiteStats.onlineUsers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-surface-variant/10 backdrop-blur-sm rounded-lg border border-surface/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-on-surface-variant mb-1">总帖子数</p>
                <p className="text-2xl font-bold text-purple-400">{websiteStats.totalPosts}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-surface-variant/10 backdrop-blur-sm rounded-lg border border-surface/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-on-surface-variant mb-1">今日新帖</p>
                <p className="text-2xl font-bold text-orange-400">{websiteStats.dailyNewPosts}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-surface-variant/10 backdrop-blur-sm p-1 rounded-lg border border-surface/20 w-fit">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/10'
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-surface-variant/10 backdrop-blur-sm rounded-lg border border-surface/20 p-8">
          {/* 用户管理 */}
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-on-surface">用户管理</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-tertiary" size={20} />
                  <input
                    type="text"
                    placeholder="搜索用户..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-surface-variant/10 border border-surface/30 rounded-lg text-on-surface placeholder-on-surface-tertiary w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface/20">
                      <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">用户信息</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">邮箱</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">IP地址</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">积分/等级</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">注册时间</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">最后登录</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      console.log('🔍 [AdminPage] 渲染表格，filteredUsers.length:', filteredUsers.length, 'allUsers.length:', allUsers.length);
                      if (filteredUsers.length > 0) {
                        return filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-surface/10 hover:bg-surface-variant/5">
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-emerald-600/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                              {user.hasUploadedAvatar && user.avatar ? (
                                <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <span className="text-emerald-400 text-sm font-semibold">{user.username?.charAt(0) || 'U'}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-on-surface font-medium">{user.username || '未知用户'}</div>
                              <div className="text-xs text-on-surface-tertiary">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-on-surface-variant text-sm">{user.email}</td>
                        <td className="px-4 py-4 text-on-surface-variant text-sm">{user.ipAddress || '未知'}</td>
                        <td className="px-4 py-4">
                          <div className="text-emerald-400 font-medium">{user.points} 积分</div>
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium mt-1" style={{ backgroundColor: `${user.level?.color}20`, color: user.level?.color }}>
                            {user.level.name}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-on-surface-variant text-sm">{new Date(user.joinDate).toLocaleDateString('zh-CN')}</td>
                        <td className="px-4 py-4 text-on-surface-variant text-sm">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('zh-CN') : <span className="text-on-surface-tertiary italic">从未登录</span>}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isAdmin ? 'bg-red-500/20 text-red-300' : 
                            (typeof user.id === 'string' && (user.id as string).startsWith('bot_')) ? 'bg-blue-500/20 text-blue-300' : 
                            'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {user.isAdmin ? '管理员' : (typeof user.id === 'string' && (user.id as string).startsWith('bot_')) ? '机器人' : '普通用户'}
                          </span>
                        </td>
                      </tr>
                        ));
                      } else {
                        return (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-on-surface-tertiary">
                          {searchTerm ? '没有找到匹配的用户' : '暂无用户数据'}
                        </td>
                      </tr>
                        );
                      }
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 机器人账号管理 */}
          {activeTab === 'bots' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-on-surface">机器人账号管理</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-300">创建数量：</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={accountCount}
                      onChange={(e) => setAccountCount(parseInt(e.target.value) || 10)}
                      className="w-20 px-2 py-1 bg-surface-variant/10 border border-surface/30 rounded text-on-surface text-sm"
                    />
                  </div>
                  <button
                    onClick={handleCreateAccounts}
                    disabled={isCreatingAccounts}
                    className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isCreatingAccounts ? '创建中...' : '批量创建'}
                  </button>
                </div>
              </div>

              {createdAccounts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                          用户名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                          邮箱
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                          密码
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                          积分/等级
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                          行业身份
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          创建时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {createdAccounts.map((account) => (
                        <tr key={account.id} className="hover:bg-white/5">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingBot === account.id ? (
                              <input
                                type="text"
                                value={editForm.username}
                                onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                className="w-full px-2 py-1 bg-white/10 border border-white/30 rounded text-white text-sm"
                              />
                            ) : (
                              <div>
                                <div className="text-white font-medium">{account.username}</div>
                                <div className="text-xs text-gray-400">{new Date(account.joinDate).toLocaleDateString('zh-CN')}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                            {account.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-300 font-mono text-sm">
                                {showPasswords[account.id] ? account.password : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(account.id)}
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                {showPasswords[account.id] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingBot === account.id ? (
                              <div className="space-y-2">
                                <input
                                  type="number"
                                  value={editForm.points}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                                  className="w-full px-2 py-1 bg-white/10 border border-white/30 rounded text-white text-sm"
                                  min="0"
                                />
                                <span 
                                  className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                                  style={{ backgroundColor: `${getUserLevel(editForm.points).color}20`, color: getUserLevel(editForm.points).color }}
                                >
                                  {getUserLevel(editForm.points).name}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <div className="text-emerald-400 font-medium">{account.points} 积分</div>
                                <span 
                                  className="inline-block px-2 py-1 rounded-full text-xs font-medium mt-1"
                                  style={{ backgroundColor: `${account.level?.color}20`, color: account.level?.color }}
                                >
                                  {account.level.name}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingBot === account.id ? (
                              <div className="space-y-2">
                                {INDUSTRY_ROLES.map(role => {
                                  // 确保 editForm.roles 是数组类型
                                  const safeRoles = Array.isArray(editForm.roles) ? editForm.roles : [];
                                  return (
                                    <label key={role.id} className="flex items-center space-x-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={safeRoles.includes(role.id)}
                                        onChange={() => handleRoleToggle(role.id)}
                                        className="rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                                      />
                                      <span className="text-gray-300">{role.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {Array.isArray(account.roles) && account.roles.length > 0 ? (
                                  account.roles.map((roleId: string) => {
                                    const role = INDUSTRY_ROLES.find(r => r.id === roleId);
                                    return role ? (
                                      <span
                                        key={roleId}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                      >
                                        {role.label}
                                      </span>
                                    ) : null;
                                  })
                                ) : (
                                  <span className="text-xs text-gray-500">未设置</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                            {new Date(account.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                                机器人
                              </span>
                              {editingBot === account.id ? (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={handleSaveBot}
                                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                    title="保存"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                    title="取消"
                                  >
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEditBot(account)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                  title="编辑"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {createdAccounts.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 text-on-surface-tertiary mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-on-surface mb-2">暂无机器人账号</h3>
                  <p className="text-on-surface-variant">点击"批量创建"按钮开始创建机器人账号</p>
                </div>
              )}
            </div>
          )}

          {/* 其他标签页的简单占位符 */}
          {(activeTab === 'merchants' || activeTab === 'blacklist') && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-on-surface mb-4">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <p className="text-on-surface-variant">
                此功能正在开发中，请使用"用户管理"或"机器人账号"功能。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
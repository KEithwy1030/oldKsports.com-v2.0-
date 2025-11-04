// src/pages/BlacklistManagement.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  EyeOff,
  User
} from 'lucide-react';
import BrowserCompatibleModal from '../components/BrowserCompatibleModal';

interface BlacklistEntry {
  id: number;
  name: string;
  description: string;
  category: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'verified' | 'resolved' | 'dismissed';
  contact_info?: string;
  report_source?: 'platform' | 'user';
  created_by: number;
  created_at: string;
  updated_at: string;
  creator_username?: string;
}

interface BlacklistFormData {
  name: string;
  description: string;
  category: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'verified' | 'resolved' | 'dismissed';
  contact_info?: string;
  report_source?: 'platform' | 'user';
}

const BlacklistManagement: React.FC = () => {
  const { user } = useAuth();
  const [blacklistEntries, setBlacklistEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // 检测浏览器类型
  const isSogouBrowser = React.useMemo(() => {
    return navigator.userAgent.includes('MetaSr') || navigator.userAgent.includes('Sogou');
  }, []);
  const [editingEntry, setEditingEntry] = useState<BlacklistEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // 已移除严重程度展示，不再提供前端筛选
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState<BlacklistFormData>({
    name: '',
    description: '',
    category: 'medium',
    status: 'pending',
    contact_info: '',
    report_source: 'user'
  });

  // 联系方式类型与值（与商家管理保持一致）
  const CONTACT_TYPES = [
    { label: '📧 邮箱', value: '📧', id: 'email' },
    { label: '✈️ 飞机', value: '✈️', id: 'telegram' },
    { label: '🐧 QQ', value: '🐧', id: 'qq' },
    { label: '🌍 微信', value: '🌍', id: 'wechat' }
  ];
  const [contactIcon, setContactIcon] = useState('📧');
  const [contactValue, setContactValue] = useState('');

  // 安全小工具：将任意值转换为小写字符串，避免空值导致崩溃
  const toLowerSafe = (value: any): string => {
    if (typeof value === 'string') return value.toLowerCase();
    if (value === undefined || value === null) return '';
    try {
      return String(value).toLowerCase();
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchBlacklistEntries();
    }
  }, [user]);

  const fetchBlacklistEntries = async () => {
    try {
      const token = localStorage.getItem('oldksports_auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/blacklist`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBlacklistEntries(data.data);
        }
      }
    } catch (error) {
      console.error('获取黑榜列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('oldksports_auth_token');
      
      // 发送与先前一致的字段（保持简单）
      const requestBody = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        // 不在新增阶段改变状态，默认由后端设为 pending
        contact_info: `${contactIcon}${contactValue || ''}`,
        report_source: formData.report_source || 'user'
      };
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/blacklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowAddModal(false);
          setFormData({
            name: '',
            description: '',
            category: 'medium',
            status: 'pending',
            contact_info: '',
            report_source: 'user'
          });
          setContactIcon('📧');
          setContactValue('');
          fetchBlacklistEntries();
        }
      } else {
        const errorData = await response.json();
        console.error('添加黑榜失败:', errorData);
        alert('添加黑榜记录失败：' + (errorData.error || '未知错误'));
      }
    } catch (error) {
      console.error('添加黑榜记录失败:', error);
      alert('添加黑榜记录失败：网络错误');
    }
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    try {
      const token = localStorage.getItem('oldksports_auth_token');
      
      // 发送与merchants表一致的字段
      const requestBody = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        // 编辑时不提交状态，发布由按钮控制
        contact_info: `${contactIcon}${contactValue || ''}`,
        report_source: formData.report_source || 'user'
      };
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/blacklist/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowEditModal(false);
          setEditingEntry(null);
          fetchBlacklistEntries();
        }
      } else {
        const errorData = await response.json();
        console.error('更新黑榜失败:', errorData);
        alert('更新黑榜记录失败：' + (errorData.error || '未知错误'));
      }
    } catch (error) {
      console.error('更新黑榜记录失败:', error);
      alert('更新黑榜记录失败：网络错误');
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('确定要删除这个黑榜记录吗？')) return;

    try {
      const token = localStorage.getItem('oldksports_auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/blacklist/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          fetchBlacklistEntries();
        }
      }
    } catch (error) {
      console.error('删除黑榜记录失败:', error);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const token = localStorage.getItem('oldksports_auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/blacklist/${id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          fetchBlacklistEntries();
        }
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const openEditModal = (entry: BlacklistEntry) => {
    setEditingEntry(entry);
    setFormData({
      name: entry.name,
      description: entry.description,
      category: entry.category,
      status: entry.status,
      contact_info: entry.contact_info || '',
      report_source: entry.report_source || 'user'
    });
    // 解析已有联系方式
    const info = entry.contact_info || '';
    let icon = '📧';
    let value = info;
    if (info.startsWith('📧')) { icon = '📧'; value = info.substring(2); }
    else if (info.startsWith('✈️')) { icon = '✈️'; value = info.substring(2); }
    else if (info.startsWith('🐧')) { icon = '🐧'; value = info.substring(2); }
    else if (info.startsWith('🌍')) { icon = '🌍'; value = info.substring(2); }
    setContactIcon(icon);
    setContactValue(value);
    setShowEditModal(true);
  };

  // 已移除严重程度文案与配色

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-900/20';
      case 'verified': return 'text-red-400 bg-red-900/20';
      case 'resolved': return 'text-green-400 bg-green-900/20';
      case 'dismissed': return 'text-on-surface-tertiary bg-surface/20';
      default: return 'text-on-surface-tertiary bg-surface/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'verified': return '已确认';
      case 'resolved': return '已解决';
      case 'dismissed': return '已驳回';
      default: return status;
    }
  };

  // 先做一次安全清洗，确保必需字段存在
  const sanitizedEntries = (blacklistEntries || []).map(e => ({
    ...e,
    name: typeof e?.name === 'string' ? e.name : '',
    description: typeof e?.description === 'string' ? e.description : ''
  }));

  const filteredEntries = sanitizedEntries.filter(entry => {
    const term = toLowerSafe(searchTerm).trim();
    const matchesSearch = term
      ? (toLowerSafe(entry.name).includes(term) || toLowerSafe(entry.description).includes(term))
      : true;
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-on-surface mb-2">访问被拒绝</h1>
          <p className="text-on-surface-tertiary">您没有权限访问此页面</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-on-surface-tertiary">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-surface mb-2">曝光黑榜管理</h1>
          <p className="text-on-surface-tertiary">管理不良商家黑榜，维护行业健康发展</p>
        </div>

        {/* 警告提示 */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-red-400 font-semibold mb-1">重要提醒</h3>
              <p className="text-on-surface-variant text-sm">
                以下信息仅供参考，具体情况请自行核实。黑榜记录将影响商家信誉，请谨慎操作。
              </p>
            </div>
          </div>
        </div>

        {/* 操作栏 */}
        <div className="bg-surface-variant rounded-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-tertiary w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索商家名称或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-surface-tertiary border border-border-surface rounded-lg text-on-surface placeholder-on-surface-tertiary focus:outline-none focus:border-red-500 w-full sm:w-64"
                />
              </div>

              {/* 已移除严重程度筛选 */}

              {/* 状态筛选 */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-surface-tertiary border border-border-surface rounded-lg text-on-surface focus:outline-none focus:border-red-500"
              >
                <option value="all">所有状态</option>
                <option value="pending">待审核</option>
                <option value="verified">已确认</option>
                <option value="resolved">已解决</option>
                <option value="dismissed">已驳回</option>
              </select>
            </div>

            {/* 添加记录按钮 */}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加黑榜记录
            </button>
          </div>
        </div>

        {/* 黑榜记录列表 - 使用卡片网格布局 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="bg-surface-variant rounded-lg p-6 border border-border-surface">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-on-surface">{entry.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(entry.status)}`}>
                        {getStatusLabel(entry.status)}
                      </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(entry)}
                    className="p-2 text-on-surface-tertiary hover:text-blue-400 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-2 text-on-surface-tertiary hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">{entry.description}</p>

              <div className="space-y-2 mb-4">
                {entry.contact_info && (
                  <div className="flex items-center gap-2 text-sm text-on-surface-tertiary">
                    <span>联系方式：</span>
                    <span className="force-italic">{entry.contact_info}</span>
                  </div>
                )}
                {entry.report_source && (
                  <div className="flex items-center gap-2 text-sm text-on-surface-tertiary">
                    <span>来源：</span>
                    <span>{entry.report_source === 'platform' ? '平台官方' : '用户举报'}</span>
                </div>
              )}
                {entry.creator_username && (
                  <div className="flex items-center gap-2 text-sm text-on-surface-tertiary">
                    <User className="w-4 h-4" />
                    <span>创建者: {entry.creator_username}</span>
                    </div>
                  )}
                <div className="flex items-center gap-2 text-sm text-on-surface-tertiary">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(entry.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                </div>

                <div className="flex gap-2">
                  {entry.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(entry.id, 'verified')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        确认
                      </button>
                      <button
                        onClick={() => handleStatusChange(entry.id, 'dismissed')}
                      className="flex-1 bg-surface-tertiary hover:bg-surface-tertiary/80 text-on-surface py-2 px-3 rounded text-sm flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        驳回
                      </button>
                    </>
                  )}
                  {entry.status === 'verified' && (
                    <button
                      onClick={() => handleStatusChange(entry.id, 'resolved')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                    已解决
                    </button>
                  )}
                  {entry.status === 'resolved' && (
                    <button
                      onClick={() => handleStatusChange(entry.id, 'verified')}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded text-sm flex items-center justify-center gap-1"
                    >
                      <Clock className="w-4 h-4" />
                      重新激活
                    </button>
                  )}
                {entry.status === 'dismissed' && (
                  <button
                    onClick={() => handleStatusChange(entry.id, 'verified')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    激活
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">暂无黑榜记录</h3>
            <p className="text-gray-500">没有找到符合条件的黑榜记录</p>
          </div>
        )}
      </div>

      {/* 添加黑榜记录模态框 */}
      <BrowserCompatibleModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        isSogouBrowser={isSogouBrowser}
      >
        <div className="bg-surface-variant rounded-lg p-6 w-full max-w-md shadow-2xl">
          <div onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-on-surface mb-4">添加黑榜记录</h2>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">商家名称</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-tertiary border border-border-surface rounded-lg text-on-surface focus:outline-none focus:border-red-500"
                  placeholder="例如：完美体育"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">违规描述</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-tertiary border border-border-surface rounded-lg text-on-surface focus:outline-none focus:border-red-500 h-24"
                  placeholder="例如：虚假宣传，恶意欠薪，拖欠40名主播工资后改名跑路"
                />
              </div>
              {/* 联系方式 */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">联系方式</label>
                <div className="flex gap-2">
                  <select
                    value={contactIcon}
                    onChange={(e) => setContactIcon(e.target.value)}
                    className="px-3 py-2 bg-surface-tertiary border border-border-surface rounded-lg text-on-surface focus:outline-none focus:border-red-500"
                  >
                    {CONTACT_TYPES.map(type => (
                      <option key={type.id} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    className="flex-1 px-3 py-2 bg-surface-tertiary border border-border-surface rounded-lg text-on-surface focus:outline-none focus:border-red-500"
                    placeholder="请输入联系方式..."
                  />
                </div>
              </div>
              {/* 举报来源 */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">举报来源</label>
                <select
                  value={formData.report_source}
                  onChange={(e) => setFormData({ ...formData, report_source: e.target.value as 'platform' | 'user' })}
                  className="px-3 py-2 bg-surface-tertiary border border-border-surface rounded-lg text-on-surface focus:outline-none focus:border-red-500"
                >
                  <option value="user">用户举报</option>
                  <option value="platform">平台官方核实</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-surface-tertiary hover:bg-surface-tertiary/80 text-on-surface rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      </BrowserCompatibleModal>

      {/* 编辑黑榜记录模态框 */}
      <BrowserCompatibleModal 
        isOpen={showEditModal && !!editingEntry} 
        onClose={() => setShowEditModal(false)}
        isSogouBrowser={isSogouBrowser}
      >
        {editingEntry && (
        <div className="bg-surface-variant rounded-lg p-6 w-full max-w-md shadow-2xl">
          <div onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-on-surface mb-4">编辑黑榜记录</h2>
            <form onSubmit={handleEditEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">商家名称</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-tertiary border border-border-surface rounded-lg text-on-surface focus:outline-none focus:border-red-500"
                  placeholder="例如：完美体育"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">违规描述</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500 h-24"
                  placeholder="例如：虚假宣传，恶意欠薪，拖欠40名主播工资后改名跑路"
                />
              </div>
              {/* 联系方式 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">联系方式</label>
                <div className="flex gap-2">
                  <select
                    value={contactIcon}
                    onChange={(e) => setContactIcon(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                  >
                    {CONTACT_TYPES.map(type => (
                      <option key={type.id} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                    placeholder="请输入联系方式..."
                  />
                </div>
              </div>
              {/* 举报来源 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">举报来源</label>
                <select
                  value={formData.report_source}
                  onChange={(e) => setFormData({ ...formData, report_source: e.target.value as 'platform' | 'user' })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                >
                  <option value="user">用户举报</option>
                  <option value="platform">平台官方核实</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  更新
                </button>
              </div>
            </form>
          </div>
        </div>
        )}
      </BrowserCompatibleModal>
    </div>
  );
};

export default BlacklistManagement;

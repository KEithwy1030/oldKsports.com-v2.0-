import React, { useState, useEffect } from 'react';
import { ExternalLink, Calendar, Globe, Users, Shield, Plus, Edit, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { Merchant } from '../types';
import { getSystemAvatar } from '../components/SystemAvatars';
import { debugLog } from '../utils/debug';

const MerchantsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'gold' | 'clients' | 'streamers'>('all');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  // 从数据库获取商家数据
  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        // 使用公开的商家API端点，不需要管理员权限
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/merchants`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setMerchants(data.data);
            debugLog('获取到的商家数据:', data.data);
          }
        } else {
          console.error('API响应错误:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('获取商家数据失败:', error);
        // 如果获取失败，使用空数组
        setMerchants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMerchants();
  }, []);

  // 根据分类筛选商家
  const allMerchants = merchants; // 显示所有商家
  const goldMerchants = merchants.filter(m => m.category === 'gold');
  const honestClients = merchants.filter(m => m.category === 'advertiser'); 
  const reliableStreamers = merchants.filter(m => m.category === 'streamer');

  // 根据当前选中的标签获取要显示的商家
  const getDisplayMerchants = () => {
    switch (activeTab) {
      case 'gold':
        return goldMerchants;
      case 'clients':
        return honestClients;
      case 'streamers':
        return reliableStreamers;
      default:
        return allMerchants; // 默认显示所有商家
    }
  };

  const displayMerchants = getDisplayMerchants();

  const getCurrentData = () => {
    switch (activeTab) {
      case 'gold': return goldMerchants;
      case 'clients': return honestClients;
      case 'streamers': return reliableStreamers;
      default: return allMerchants; // 默认返回所有商家
    }
  };

  const tabs = [
    { id: 'gold', label: '金牌商家', icon: Users, description: '优质服务商和供应商' },
    { id: 'clients', label: '诚信甲方', icon: Shield, description: '可靠的广告主和合作方' },
    { id: 'streamers', label: '靠谱主播', icon: Users, description: '专业的体育主播和创作者' }
  ];

  const currentMerchants = getCurrentData();

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-radial dark:from-slate-700 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12 stagger-children">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4" style={{ '--stagger-delay': '1' } as React.CSSProperties}>
              优秀合作伙伴展位
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto" style={{ '--stagger-delay': '2' } as React.CSSProperties}>
              经过严格筛选的行业优质资源，为体育媒体人提供可靠的商业服务和合作机会
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8" style={{ '--stagger-delay': '4' } as React.CSSProperties}>
            <div className="flex space-x-1 bg-gray-200 dark:bg-white/10 backdrop-blur-sm p-1 rounded-lg border border-gray-300 dark:border-white/20">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                
                // 根据分类获取对应的颜色主题 - 颜色应用到背景，文字始终为白色
                const getTabColors = () => {
                  switch (tab.id) {
                    case 'gold': // 金牌商家 - 橙色背景
                      return isActive
                        ? 'bg-orange-600 text-white shadow-sm border border-orange-500'
                        : 'bg-orange-600/20 text-white hover:bg-orange-600/30 border border-orange-500/30';
                    case 'clients': // 诚信甲方 - 蓝色背景
                      return isActive
                        ? 'bg-blue-600 text-white shadow-sm border border-blue-500'
                        : 'bg-blue-600/20 text-white hover:bg-blue-600/30 border border-blue-500/30';
                    case 'streamers': // 靠谱主播 - 紫色背景
                      return isActive
                        ? 'bg-purple-600 text-white shadow-sm border border-purple-500'
                        : 'bg-purple-600/20 text-white hover:bg-purple-600/30 border border-purple-500/30';
                    default:
                      return isActive
                        ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20';
                  }
                };
                
                // 图标始终为白色
                const getIconColor = () => {
                  return 'text-white';
                };
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-6 py-4 rounded-md font-medium transition-all ${getTabColors()}`}
                  >
                    <IconComponent className={`w-5 h-5 ${getIconColor()}`} />
                    <div className="text-left">
                      <div>{tab.label}</div>
                      <div className="text-xs opacity-75">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Management Panel */}
          {user?.isAdmin && (
            <div className="mb-8 bg-emerald-100 dark:bg-emerald-500/20 backdrop-blur-sm rounded-lg border border-emerald-300 dark:border-emerald-400/30 p-6" style={{ '--stagger-delay': '5' } as React.CSSProperties}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-200 dark:bg-emerald-600/20 rounded-full flex items-center justify-center border border-emerald-400 dark:border-emerald-500/30">
                    <Edit className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">管理员控制面板</h3>
                    <p className="text-emerald-700 dark:text-emerald-300 text-sm">管理优秀商家信息</p>
                  </div>
                </div>
                
                <Link
                  to="/admin"
                  className="inline-flex items-center bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  进入管理后台
                </Link>
              </div>
              
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                <div className="bg-emerald-200 dark:bg-emerald-600/20 rounded-lg p-3 border border-emerald-400 dark:border-emerald-500/30">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">添加商家</h4>
                  <p className="text-emerald-700 dark:text-emerald-200 text-xs">添加新的优秀合作伙伴</p>
                </div>
                <div className="bg-emerald-200 dark:bg-emerald-600/20 rounded-lg p-3 border border-emerald-400 dark:border-emerald-500/30">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">编辑信息</h4>
                  <p className="text-emerald-700 dark:text-emerald-200 text-xs">修改现有商家资料</p>
                </div>
                <div className="bg-emerald-200 dark:bg-emerald-600/20 rounded-lg p-3 border border-emerald-400 dark:border-emerald-500/30">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">分类管理</h4>
                  <p className="text-emerald-700 dark:text-emerald-200 text-xs">管理不同类型的商家</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mb-4"></div>
              <p className="text-gray-700 dark:text-gray-300">正在加载商家数据...</p>
            </div>
          )}

          {/* Merchants Grid */}
          {!loading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 stagger-children" style={{ '--stagger-delay': '6' } as React.CSSProperties}>
              {displayMerchants.length > 0 ? (
                displayMerchants.map((merchant, index) => (
              <div
                key={merchant.id}
                className={`bg-white dark:bg-white/10 backdrop-blur-sm rounded-lg border overflow-hidden transition-all duration-300 flex flex-col ${
                  merchant.category === 'gold' 
                    ? 'border-orange-300 dark:border-orange-400/30 hover:border-orange-400' 
                    : merchant.category === 'advertiser' 
                    ? 'border-blue-300 dark:border-blue-400/30 hover:border-blue-400' 
                    : merchant.category === 'streamer' 
                    ? 'border-purple-300 dark:border-purple-400/30 hover:border-purple-400' 
                    : 'border-gray-200 dark:border-white/20 hover:border-emerald-400'
                }`}
                style={{ '--stagger-delay': `${7 + index}` } as React.CSSProperties}
              >
                <div className="p-6 flex-1">
                  <div className="flex items-start space-x-4">
                    {/* 使用系统头像根据商家分类显示不同角色 */}
                    {getSystemAvatar(merchant.category, "w-16 h-16")}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {merchant.name}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {merchant.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>加入时间：{new Date(merchant.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                    
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium text-gray-900 dark:text-white">联系方式：</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{(merchant as any).contact_info || (merchant as any).contactInfo || '—'}</span>
                    </div>
                    
                    {merchant.website && (
                      <a
                        href={merchant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        访问官网
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
                
                {/* 根据商家分类显示不同的认证标签和颜色 */}
                {(() => {
                  const getCategoryInfo = () => {
                    switch (merchant.category) {
                      case 'gold':
                        return {
                          label: '✓ 金牌商家',
                          bgColor: 'bg-orange-600/20',
                          borderColor: 'border-orange-500/30',
                          textColor: 'text-orange-300'
                        };
                      case 'advertiser':
                        return {
                          label: '✓ 诚信甲方',
                          bgColor: 'bg-blue-600/20',
                          borderColor: 'border-blue-500/30',
                          textColor: 'text-blue-300'
                        };
                      case 'streamer':
                        return {
                          label: '✓ 靠谱主播',
                          bgColor: 'bg-purple-600/20',
                          borderColor: 'border-purple-500/30',
                          textColor: 'text-purple-300'
                        };
                      default:
                        return {
                          label: '✓ 优质认证商家',
                          bgColor: 'bg-emerald-600/20',
                          borderColor: 'border-emerald-500/30',
                          textColor: 'text-emerald-300'
                        };
                    }
                  };
                  
                  const categoryInfo = getCategoryInfo();
                  
                  return (
                    <div className={`${categoryInfo.bgColor} ${categoryInfo.borderColor} border-t min-h-[48px] flex items-center justify-center rounded-b-lg`}> 
                      <span className={`${categoryInfo.textColor} text-sm font-medium`}>{categoryInfo.label}</span>
                    </div>
                  );
                })()}
              </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-400 dark:border-gray-500/30">
                    <Globe className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    暂无{activeTab === 'gold' ? '金牌商家' : activeTab === 'clients' ? '诚信甲方' : activeTab === 'streamers' ? '靠谱主播' : '商家信息'}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">我们正在严格筛选优质合作伙伴</p>
                  {user?.isAdmin && (
                    <Link
                      to="/admin/merchants"
                      className="inline-flex items-center mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加商家
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default MerchantsPage;
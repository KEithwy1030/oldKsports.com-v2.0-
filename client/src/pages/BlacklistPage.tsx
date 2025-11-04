import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Calendar, Shield, Edit, Settings } from 'lucide-react';
import { mockMerchants } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';

const BlacklistPage: React.FC = () => {
  const { user } = useAuth();
  const [blacklistedMerchants, setBlacklistedMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 从管理员后台获取黑榜数据
  const loadBlacklist = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/blacklist/public`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const formattedEntries = data.data.map((entry: any) => ({
            id: entry.id,
            name: entry.name,
            reason: entry.description,
            contactInfo: entry.contact_info,
            addedAt: entry.created_at
          }));
          setBlacklistedMerchants(formattedEntries);
        }
      }
    } catch (error) {
      console.error('加载黑榜失败:', error);
      setBlacklistedMerchants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-radial dark:from-slate-700 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12 stagger-children">
            <div className="flex items-center justify-center mb-4" style={{ '--stagger-delay': '1' } as React.CSSProperties}>
              <Shield className="w-8 h-8 text-red-600 dark:text-red-400 mr-2" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">不良商家黑榜</h1>
            </div>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto" style={{ '--stagger-delay': '2' } as React.CSSProperties}>
              管理员维护的官方黑榜，为维护行业健康发展，曝光存在不良行为的商家
            </p>
            
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-400/30 rounded-lg max-w-2xl mx-auto backdrop-blur-sm" style={{ '--stagger-delay': '3' } as React.CSSProperties}>
              <p className="text-sm text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                以下信息仅供参考，具体情况请自行核实
              </p>
            </div>
          </div>

          {/* Admin Management Panel */}
          {user?.isAdmin && (
            <div className="mb-8 bg-red-100 dark:bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-300 dark:border-red-400/30 p-6" style={{ '--stagger-delay': '4' } as React.CSSProperties}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-200 dark:bg-red-600/20 rounded-full flex items-center justify-center border border-red-400 dark:border-red-500/30">
                    <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">管理员控制面板</h3>
                    <p className="text-red-700 dark:text-red-300 text-sm">管理曝光黑榜信息</p>
                  </div>
                </div>
                
                <Link
                  to="/admin"
                  className="inline-flex items-center bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  进入管理后台
                </Link>
              </div>
              
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                <div className="bg-red-200 dark:bg-red-600/20 rounded-lg p-3 border border-red-400 dark:border-red-500/30">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">添加黑榜</h4>
                  <p className="text-red-700 dark:text-red-200 text-xs">曝光不良商家行为</p>
                </div>
                <div className="bg-red-200 dark:bg-red-600/20 rounded-lg p-3 border border-red-400 dark:border-red-500/30">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">编辑记录</h4>
                  <p className="text-red-700 dark:text-red-200 text-xs">修改现有曝光信息</p>
                </div>
                <div className="bg-red-200 dark:bg-red-600/20 rounded-lg p-3 border border-red-400 dark:border-red-500/30">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">审核管理</h4>
                  <p className="text-red-700 dark:text-red-200 text-xs">维护黑榜记录准确性</p>
                </div>
              </div>
            </div>
          )}

          {/* Blacklist Table */}
          {blacklistedMerchants.length > 0 && (
            <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/20 overflow-hidden" style={{ '--stagger-delay': '5' } as React.CSSProperties}>
              <div className="px-6 py-4 bg-red-100 dark:bg-red-500/20 border-b border-red-300 dark:border-red-400/30">
                <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">官方曝光记录</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-white/20">
                  <thead className="bg-gray-100 dark:bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        商家名称
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        曝光原因
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        曝光时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        联系信息
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {blacklistedMerchants.map((merchant) => (
                      <tr key={merchant.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900 dark:text-white">{merchant.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-red-700 dark:text-red-300 font-medium">{merchant.reason}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(merchant.addedAt).toLocaleDateString('zh-CN')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {merchant.contactInfo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {blacklistedMerchants.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-400 dark:text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无黑榜记录</h3>
              <p className="text-gray-700 dark:text-gray-300">管理员暂未添加任何黑榜记录</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-8 p-6 bg-white dark:bg-white/10 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/20" style={{ '--stagger-delay': '6' } as React.CSSProperties}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">免责声明</h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <p>• 黑榜信息由管理员审核后发布，平台已尽力核实</p>
              <p>• 建议在商业合作前进行充分的尽职调查</p>
              <p>• 如有异议或需要更正信息，请联系平台管理员</p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default BlacklistPage;
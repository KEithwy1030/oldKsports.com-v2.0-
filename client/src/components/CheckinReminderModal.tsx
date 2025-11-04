import React from 'react';
import { X, Calendar, Gift, Star } from 'lucide-react';

interface CheckinReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCheckin: () => void;
  consecutiveDays?: number;
}

const CheckinReminderModal: React.FC<CheckinReminderModalProps> = ({
  isOpen,
  onClose,
  onNavigateToCheckin,
  consecutiveDays = 0
}) => {
  console.log('🔔 CheckinReminderModal渲染 - isOpen:', isOpen, 'consecutiveDays:', consecutiveDays);
  
  if (!isOpen) {
    console.log('🔔 CheckinReminderModal不渲染 - isOpen为false');
    return null;
  }
  
  console.log('🔔 CheckinReminderModal正在渲染弹窗');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-slate-600">
        {/* 头部 */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">每日签到提醒</h2>
              <p className="text-sm text-gray-400">不要错过今日的积分奖励</p>
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 pb-6">
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">签到奖励</span>
              <div className="flex items-center space-x-1 text-emerald-400">
                <Gift size={16} />
                <span className="font-bold">+10 积分</span>
              </div>
            </div>
            
            {consecutiveDays > 0 && (
              <div className="flex items-center space-x-2 text-sm">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300">
                  连续签到 <span className="text-yellow-400 font-bold">{consecutiveDays}</span> 天
                </span>
              </div>
            )}
          </div>

          <p className="text-gray-300 text-sm mb-6 leading-relaxed">
            每日签到可以获得积分奖励，连续签到还能获得更多奖励！快去个人中心完成今日签到吧。
          </p>

          {/* 按钮 */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors font-medium"
            >
              稍后再说
            </button>
            <button
              onClick={onNavigateToCheckin}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg"
            >
              立即签到
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckinReminderModal;

import { UserLevel } from '../types';

export const USER_LEVELS: UserLevel[] = [
  { id: 1, name: '菜鸟新人', minPoints: 1, color: '#6b7280' },
  { id: 2, name: '潜力新星', minPoints: 100, color: '#3b82f6' },
  { id: 3, name: '体育达人', minPoints: 300, color: '#8b5cf6' },
  { id: 4, name: '行业大佬', minPoints: 600, color: '#f59e0b' },
];

export const FORUM_CATEGORIES = [
  { id: 'general', name: '行业茶水间', description: '轻松聊天，分享日常' },
  { id: 'business', name: '商务＆合作', description: '商业机会和合作讨论' },
  { id: 'news', name: '黑榜曝光', description: '曝光不良商家，维护行业秩序' },
];

export const POINTS_SYSTEM = {
  REGISTRATION: 20,
  DAILY_CHECKIN: 10,
  CREATE_POST: 20,
  REPLY_POST: 5,
  UPLOAD_AVATAR: 10,
};

export const INDUSTRY_ROLES = [
  { id: 'streamer', label: '主播' },
  { id: 'client', label: '甲方' },
  { id: 'service_provider', label: '服务商' },
  { id: 'other', label: '其他' },
];
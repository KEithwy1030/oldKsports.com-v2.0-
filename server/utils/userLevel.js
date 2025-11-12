// 用户级别工具函数
// 与前端保持一致

const USER_LEVELS = [
  { id: 1, name: '菜鸟新人', minPoints: 1, color: '#6b7280' },
  { id: 2, name: '潜力新星', minPoints: 100, color: '#3b82f6' },
  { id: 3, name: '体育达人', minPoints: 300, color: '#8b5cf6' },
  { id: 4, name: '行业大佬', minPoints: 600, color: '#f59e0b' },
];

export const getUserLevel = (points) => {
  const level = USER_LEVELS
    .slice()
    .reverse()
    .find(level => points >= level.minPoints);
  return level || USER_LEVELS[0];
};

export const addUserLevel = (user) => {
  if (!user || typeof user.points !== 'number') {
    return user;
  }
  
  // 优先使用 join_date（真实注册时间），如果没有则使用 created_at 或已有的 joinDate
  const joinDate = user.join_date || user.created_at || user.joinDate;
  
  return {
    ...user,
    level: getUserLevel(user.points),
    // 确保字段映射正确
    isAdmin: user.is_admin || user.isAdmin || false,
    joinDate: joinDate,
    // 保留last_login字段
    lastLogin: user.last_login || user.lastLogin || null
  };
};

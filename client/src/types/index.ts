export interface User {
  id: number;
  username: string;
  email: string;
  points: number;
  level: UserLevel;
  joinDate: Date;
  lastLogin?: Date | null;
  avatar?: string;
  isAdmin?: boolean;
  roles: string[];
  hasUploadedAvatar?: boolean;
  password?: string;
  isBot?: boolean;
  consecutiveCheckins?: number;
  ipAddress?: string; // IP地址（优先显示last_login_ip，如果没有则显示register_ip）
}

export interface UserLevel {
  id: number;
  name: string;
  minPoints: number;
  color: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: User;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  replies: ForumReply[];
  views: number;
  lastReplyAt: Date;
  isPinned?: boolean;
  likes: number;
  likedBy: string[];
}

export interface ForumReply {
  id: string;
  content: string;
  author: User;
  postId: string;
  createdAt: Date;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: User;
  status: 'draft' | 'pending' | 'published';
  createdAt: Date;
  publishedAt?: Date;
  featuredImage?: string;
}

export interface Merchant {
  id: string;
  name: string;
  description: string;
  logo: string;
  website?: string;
  contactInfo: string;
  category: string;  // 添加缺失的category属性
  created_at: string;  // 添加缺失的created_at属性
  status: 'excellent' | 'blacklisted';
  reason?: string;
  addedAt: Date;
}

export interface ChatUser {
  id: string;
  user_id?: string;  // 添加缺失的user_id属性
  username: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

export interface UserStats {
  totalPosts: number;
  totalReplies: number;
  totalPoints: number;
  level: UserLevel;
}
// Forum模块类型定义
export interface ForumPost {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author: string;
  author_avatar?: string;
  category: string;
  images?: string[];
  views: number;
  likes: number;
  replies: number;
  is_sticky: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ForumReply {
  id: number;
  post_id: number;
  author_id: number;
  author: string;
  author_avatar?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NewPostData {
  title: string;
  content: string;
  category: string;
  images?: File[];
}

export interface NewReplyData {
  post_id: number;
  content: string;
}

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export interface ForumState {
  posts: ForumPost[];
  currentPost: ForumPost | null;
  replies: ForumReply[];
  categories: ForumCategory[];
  isLoading: boolean;
  error: string | null;
}

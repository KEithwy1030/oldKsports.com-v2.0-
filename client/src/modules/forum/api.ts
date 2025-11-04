// Forum模块API接口
import { apiRequest } from '../../utils/api';
import { ForumPost, ForumReply, NewPostData, NewReplyData, ForumCategory } from './types';

export class ForumAPI {
  /**
   * 获取论坛帖子列表
   */
  static async getPosts(category?: string, page = 1, limit = 10): Promise<ForumPost[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    return apiRequest<ForumPost[]>(`/posts?${params.toString()}`);
  }

  /**
   * 获取单个帖子详情
   */
  static async getPost(postId: number): Promise<ForumPost> {
    return apiRequest<ForumPost>(`/posts/${postId}`);
  }

  /**
   * 创建新帖子
   */
  static async createPost(postData: NewPostData): Promise<ForumPost> {
    const formData = new FormData();
    formData.append('title', postData.title);
    formData.append('content', postData.content);
    formData.append('category', postData.category);
    
    if (postData.images) {
      postData.images.forEach((image, index) => {
        formData.append(`images`, image);
      });
    }

    return apiRequest<ForumPost>('/posts', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * 获取帖子回复
   */
  static async getReplies(postId: number): Promise<ForumReply[]> {
    return apiRequest<ForumReply[]>(`/posts/${postId}/replies`);
  }

  /**
   * 添加回复
   */
  static async addReply(replyData: NewReplyData): Promise<ForumReply> {
    return apiRequest<ForumReply>('/posts/reply', {
      method: 'POST',
      body: JSON.stringify(replyData),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 获取论坛分类
   */
  static async getCategories(): Promise<ForumCategory[]> {
    return apiRequest<ForumCategory[]>('/posts/categories');
  }

  /**
   * 增加帖子浏览量
   */
  static async incrementViews(postId: number): Promise<void> {
    return apiRequest<void>(`/posts/${postId}/views`, {
      method: 'POST',
    });
  }

  /**
   * 点赞帖子
   */
  static async likePost(postId: number): Promise<void> {
    return apiRequest<void>(`/posts/${postId}/like`, {
      method: 'POST',
    });
  }
}

import { getDb } from '../db.js';

class NotificationService {
  // 创建回复通知
  static async createReplyNotification(recipientId, senderId, postId, replyId, postTitle) {
    const title = `您的帖子收到新回复`;
    const content = `有人回复了您的帖子"${postTitle}"`;
    
    return this.createNotification({
      recipientId,
      senderId,
      type: 'reply',
      title,
      content,
      relatedPostId: postId,
      relatedReplyId: replyId
    });
  }

  // 创建@提及通知
  static async createMentionNotification(recipientId, senderId, postId, replyId, mentionedUsername) {
    const title = `有人@了您`;
    const content = `@${mentionedUsername} 您在帖子中被提及`;
    
    return this.createNotification({
      recipientId,
      senderId,
      type: 'mention',
      title,
      content,
      relatedPostId: postId,
      relatedReplyId: replyId
    });
  }

  // 创建私信通知
  static async createMessageNotification(recipientId, senderId, messageContent) {
    const title = `收到新私信`;
    const content = messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent;
    
    return this.createNotification({
      recipientId,
      senderId,
      type: 'message',
      title,
      content
    });
  }

  // 创建系统通知
  static async createSystemNotification(recipientId, title, content) {
    return this.createNotification({
      recipientId,
      senderId: null,
      type: 'system',
      title,
      content
    });
  }

  // 批量创建系统通知（给所有用户）
  static async createSystemNotificationForAll(title, content) {
    try {
      // 获取所有活跃用户ID
      const getUsersQuery = 'SELECT id FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      
      return new Promise((resolve, reject) => {
        getDb().query(getUsersQuery, async (err, users) => {
          if (err) {
            console.error('获取用户列表失败:', err);
            return reject(err);
          }
          
          const notifications = [];
          for (const user of users) {
            try {
              const result = await this.createSystemNotification(user.id, title, content);
              notifications.push(result);
            } catch (error) {
              console.error(`创建用户${user.id}的系统通知失败:`, error);
            }
          }
          
          resolve(notifications);
        });
      });
    } catch (error) {
      console.error('批量创建系统通知失败:', error);
      throw error;
    }
  }

  // 基础创建通知方法
  static async createNotification({
    recipientId,
    senderId = null,
    type,
    title,
    content,
    relatedPostId = null,
    relatedReplyId = null
  }) {
    return new Promise((resolve, reject) => {
      // 避免自己给自己发通知
      if (senderId && recipientId === senderId) {
        resolve({ success: true, message: '跳过自己给自己的通知' });
        return;
      }

      const query = `
        INSERT INTO notifications (recipient_id, title, content, type, is_read)
        VALUES (?, ?, ?, ?, ?)
      `;

      getDb().query(query, [recipientId, title, content, type, false], (err, result) => {
        if (err) {
          console.error('创建通知失败:', err);
          reject(err);
        } else {
          resolve({
            success: true,
            notificationId: result.insertId,
            message: '通知创建成功'
          });
        }
      });
    });
  }

  // 检查用户是否存在
  static async checkUserExists(userId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT id FROM users WHERE id = ?';
      getDb().query(query, [userId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.length > 0);
        }
      });
    });
  }

  // 解析@提及
  static extractMentions(content) {
    const mentionRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)]; // 去重
  }

  // 根据用户名获取用户ID
  static async getUserIdByUsername(username) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT id FROM users WHERE username = ?';
      getDb().query(query, [username], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.length > 0 ? results[0].id : null);
        }
      });
    });
  }

  // 处理内容中的@提及并创建通知
  static async processMentions(content, senderId, postId, replyId = null) {
    try {
      const mentions = this.extractMentions(content);
      const notifications = [];

      for (const username of mentions) {
        try {
          const recipientId = await this.getUserIdByUsername(username);
          if (recipientId && recipientId !== senderId) {
            const result = await this.createMentionNotification(
              recipientId,
              senderId,
              postId,
              replyId,
              username
            );
            notifications.push(result);
          }
        } catch (error) {
          console.error(`处理@${username}失败:`, error);
        }
      }

      return notifications;
    } catch (error) {
      console.error('处理@提及失败:', error);
      throw error;
    }
  }
}

export { NotificationService };
export default NotificationService;

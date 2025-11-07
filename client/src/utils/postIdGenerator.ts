// 帖子ID生成器 - 生成4-6位随机数字，确保永远不重复

import { debugLog } from './debug';

class PostIdGenerator {
  private usedIds: Set<string> = new Set();
  private minLength = 4;
  private maxLength = 6;

  /**
   * 生成随机数字字符串
   * @param length 长度
   * @returns 随机数字字符串
   */
  private generateRandomNumber(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min + '';
  }

  /**
   * 生成唯一的帖子ID
   * @returns 唯一的4-6位数字ID
   */
  generateUniqueId(): string {
    let attempts = 0;
    const maxAttempts = 1000; // 防止无限循环

    while (attempts < maxAttempts) {
      // 随机选择4-6位长度
      const length = Math.floor(Math.random() * (this.maxLength - this.minLength + 1)) + this.minLength;
      const id = this.generateRandomNumber(length);

      // 检查是否已使用
      if (!this.usedIds.has(id)) {
        this.usedIds.add(id);
        debugLog(`生成新的帖子ID: ${id} (长度: ${length})`);
        return id;
      }

      attempts++;
    }

    // 如果尝试次数过多，使用时间戳作为后备方案
    const fallbackId = Date.now().toString().slice(-6);
    console.warn(`使用后备ID生成方案: ${fallbackId}`);
    this.usedIds.add(fallbackId);
    return fallbackId;
  }

  /**
   * 注册已存在的ID（用于从数据库加载现有帖子时）
   * @param id 已存在的ID
   */
  registerExistingId(id: string): void {
    this.usedIds.add(id);
  }

  /**
   * 检查ID是否已被使用
   * @param id 要检查的ID
   * @returns 是否已被使用
   */
  isIdUsed(id: string): boolean {
    return this.usedIds.has(id);
  }

  /**
   * 获取已使用的ID数量
   * @returns 已使用的ID数量
   */
  getUsedIdCount(): number {
    return this.usedIds.size;
  }

  /**
   * 清空已使用的ID列表（用于测试或重置）
   */
  clearUsedIds(): void {
    this.usedIds.clear();
  }
}

// 创建单例实例
const postIdGenerator = new PostIdGenerator();

export default postIdGenerator;

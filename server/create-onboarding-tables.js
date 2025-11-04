// server/create-onboarding-tables.js
import { getDb } from './db.js';

async function createOnboardingTables() {
  try {
    console.log('🚀 开始创建新手引导相关数据表...');
    
    // 创建新手任务完成记录表
    const createOnboardingTasksTable = `
      CREATE TABLE IF NOT EXISTS onboarding_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        task_id VARCHAR(50) NOT NULL,
        reward INT NOT NULL DEFAULT 0,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_task (user_id, task_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await getDb().promise().query(createOnboardingTasksTable);
    console.log('✅ 新手任务记录表创建成功');
    
    console.log('🎉 新手引导数据表创建完成！');
    
  } catch (error) {
    console.error('❌ 创建新手引导数据表失败:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  createOnboardingTables()
    .then(() => {
      console.log('✅ 数据库表创建完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 数据库表创建失败:', error);
      process.exit(1);
    });
}

export default createOnboardingTables;

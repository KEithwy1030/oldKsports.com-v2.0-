// 导入预处理后的SQL文件到Zeabur数据库
import mysql from 'mysql2/promise';
import fs from 'fs';

const connection = await mysql.createConnection({
  host: 'hkg1.clusters.zeabur.com',
  port: 30960,
  user: 'root',
  password: 'o69t3mpT5IJY87ceslGHqQ4OS2Xnyg10',
  database: 'oldksports',
  multipleStatements: true,
  charset: 'utf8mb4',
});

try {
  console.log('✅ 连接成功！\n');
 
  // 读取预处理后的SQL文件
  let sqlContent = fs.readFileSync('../oldksports_processed.sql', 'utf8');
  console.log('✅ 已读取SQL文件\n');
 
  // 移除注释行（以 -- 开头的行），但保留空行以保持格式
  const lines = sqlContent.split('\n');
  sqlContent = lines
    .map(line => {
      const trimmed = line.trim();
      // 保留空行，移除注释行
      if (trimmed === '') return '';
      if (trimmed.startsWith('--')) return '';
      return line;
    })
    .filter(line => line !== '')
    .join('\n');
 
  // 先清空相关表（按依赖关系的逆序）
  console.log('🗑️  清空现有数据...\n');
  const tablesToClear = ['notifications', 'messages', 'forum_replies', 'forum_posts', 'users'];
  
  for (const table of tablesToClear) {
    try {
      await connection.query(`DELETE FROM \`${table}\``);
      const [result] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
      console.log(`  ✅ ${table}: 已清空 (原记录数: ${result[0].count})`);
    } catch (error) {
      // 如果表不存在或为空，继续执行
      if (error.code !== 'ER_NO_SUCH_TABLE' && error.code !== 'ER_BAD_TABLE_ERROR') {
        console.log(`  ⚠️  ${table}: ${error.message}`);
      }
    }
  }
  
  console.log('\n📝 开始执行SQL（使用multipleStatements模式）...\n');
 
  // 直接执行整个SQL内容，让MySQL客户端处理多行语句
  try {
    const [results] = await connection.query(sqlContent);
    console.log('✅ SQL执行成功！\n');
  } catch (error) {
    // 如果整个文件执行失败，尝试找出问题行
    console.error('❌ SQL执行失败:', error.message);
    if (error.sqlMessage) {
      console.error('SQL错误信息:', error.sqlMessage);
    }
    if (error.sql) {
      // 找出错误附近的SQL内容
      const errorIndex = sqlContent.indexOf(error.sql.substring(0, 100));
      if (errorIndex > 0) {
        const start = Math.max(0, errorIndex - 500);
        const end = Math.min(sqlContent.length, errorIndex + 500);
        console.error('\n错误附近的SQL内容:');
        console.error(sqlContent.substring(start, end));
      }
    }
    throw error;
  }
  
  // 验证结果
  console.log('📊 验证导入结果:\n');
  const [users] = await connection.query('SELECT COUNT(*) AS count FROM users');
  const [posts] = await connection.query('SELECT COUNT(*) AS count FROM forum_posts');
  const [replies] = await connection.query('SELECT COUNT(*) AS count FROM forum_replies');
  const [messages] = await connection.query('SELECT COUNT(*) AS count FROM messages');
  const [notifications] = await connection.query('SELECT COUNT(*) AS count FROM notifications');
  
  console.log(`  users: ${users[0].count}`);
  console.log(`  forum_posts: ${posts[0].count}`);
  console.log(`  forum_replies: ${replies[0].count}`);
  console.log(`  messages: ${messages[0].count}`);
  console.log(`  notifications: ${notifications[0].count}`);
  
  console.log('\n🎉 数据导入完成！');
  
} catch (error) {
  console.error('❌ 导入失败:', error.message);
  if (error.sql) {
    console.error('SQL错误:', error.sql.substring(0, 500));
  }
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
} finally {
  await connection.end();
}

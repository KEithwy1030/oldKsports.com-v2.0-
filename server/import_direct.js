// 直接从原始SQL文件导入最重要的三个表
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
  
  // 读取原始SQL文件
  const sqlContent = fs.readFileSync('../oldksports.sql', 'utf8');
  console.log('✅ 已读取原始SQL文件\n');
  
  // 先清空相关表
  console.log('🗑️  清空现有数据...\n');
  const tablesToClear = ['forum_replies', 'forum_posts', 'users'];
  
  for (const table of tablesToClear) {
    try {
      await connection.query(`DELETE FROM \`${table}\``);
      console.log(`  ✅ ${table}: 已清空`);
    } catch (error) {
      console.log(`  ⚠️  ${table}: ${error.message}`);
    }
  }
  
  console.log('\n📝 开始导入数据...\n');
  
  // 提取users表的INSERT语句
  const usersMatch = sqlContent.match(/INSERT INTO `users`.*?;/s);
  if (usersMatch) {
    console.log('导入 users 表...');
    let usersSQL = usersMatch[0];
    // 移除不需要的字段（role, total_posts, total_replies, consecutive_checkins, last_checkin_date）
    // 简化处理：直接执行，让MySQL处理列不匹配的问题
    usersSQL = usersSQL.replace(/INSERT INTO `users`/, "INSERT IGNORE INTO `users`");
    try {
      await connection.query(usersSQL);
      const [result] = await connection.query('SELECT COUNT(*) AS count FROM users');
      console.log(`  ✅ users: ${result[0].count} 条记录`);
    } catch (error) {
      console.error(`  ❌ users导入失败: ${error.message}`);
    }
  }
  
  // 提取forum_posts表的INSERT语句
  const postsMatch = sqlContent.match(/INSERT INTO `forum_posts`.*?;/s);
  if (postsMatch) {
    console.log('\n导入 forum_posts 表...');
    let postsSQL = postsMatch[0];
    postsSQL = postsSQL.replace(/INSERT INTO `forum_posts`/, "INSERT IGNORE INTO `forum_posts`");
    try {
      await connection.query(postsSQL);
      const [result] = await connection.query('SELECT COUNT(*) AS count FROM forum_posts');
      console.log(`  ✅ forum_posts: ${result[0].count} 条记录`);
    } catch (error) {
      console.error(`  ❌ forum_posts导入失败: ${error.message}`);
      console.error(`  错误SQL: ${postsSQL.substring(0, 500)}...`);
    }
  }
  
  // 提取forum_replies表的INSERT语句
  const repliesMatch = sqlContent.match(/INSERT INTO `forum_replies`.*?;/s);
  if (repliesMatch) {
    console.log('\n导入 forum_replies 表...');
    let repliesSQL = repliesMatch[0];
    repliesSQL = repliesSQL.replace(/INSERT INTO `forum_replies`/, "INSERT IGNORE INTO `forum_replies`");
    try {
      await connection.query(repliesSQL);
      const [result] = await connection.query('SELECT COUNT(*) AS count FROM forum_replies');
      console.log(`  ✅ forum_replies: ${result[0].count} 条记录`);
    } catch (error) {
      console.error(`  ❌ forum_replies导入失败: ${error.message}`);
    }
  }
  
  console.log('\n📊 最终统计:\n');
  const [users] = await connection.query('SELECT COUNT(*) AS count FROM users');
  const [posts] = await connection.query('SELECT COUNT(*) AS count FROM forum_posts');
  const [replies] = await connection.query('SELECT COUNT(*) AS count FROM forum_replies');
  
  console.log(`  users: ${users[0].count}`);
  console.log(`  forum_posts: ${posts[0].count}`);
  console.log(`  forum_replies: ${replies[0].count}`);
  
  console.log('\n🎉 导入完成！');
  
} catch (error) {
  console.error('❌ 导入失败:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
} finally {
  await connection.end();
}

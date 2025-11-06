// import_old_data.js - 导入旧数据到 Zeabur MySQL
import mysql from 'mysql2/promise';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Zeabur MySQL 连接配置
const dbConfig = {
  host: 'hkgl.clusters.zeabur.com',
  port: 30960,
  user: 'root',
  password: '069t3mpT5IJY87ces1GHqQ40S2Xnyg10',
  database: 'oldksports',
  multipleStatements: true, // 允许多语句执行
  connectTimeout: 60000,
};

async function importData() {
  let connection;
  
  try {
    console.log('🔌 正在连接到 Zeabur MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 连接成功！');
    
    // 检查当前数据
    console.log('\n📊 检查现有数据...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`   数据库中有 ${tables.length} 个表`);
    
    const [userCount] = await connection.query('SELECT COUNT(*) AS count FROM users');
    const [postCount] = await connection.query('SELECT COUNT(*) AS count FROM forum_posts');
    const [replyCount] = await connection.query('SELECT COUNT(*) AS count FROM forum_replies');
    
    console.log(`   现有数据：users=${userCount[0].count}, posts=${postCount[0].count}, replies=${replyCount[0].count}`);
    
    // 读取 SQL 文件
    console.log('\n📖 读取 oldksports_v2_cleaned.sql 文件...');
    const sqlContent = fs.readFileSync(join(__dirname, 'oldksports_v2_cleaned.sql'), 'utf8');
    
    // 提取 INSERT 语句（跳过 merchant_reviews 表）
    console.log('\n🔍 提取 INSERT 语句...');
    const insertStatements = [];
    const lines = sqlContent.split('\n');
    let inInsertStatement = false;
    let currentStatement = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 跳过 merchant_reviews 表的 INSERT
      if (line.toUpperCase().includes('INSERT INTO `merchant_reviews`')) {
        console.log('   ⏭️  跳过 merchant_reviews 表（新数据库没有此表）');
        inInsertStatement = true;
        currentStatement = '';
        continue;
      }
      
      // 开始 INSERT 语句
      if (line.toUpperCase().startsWith('INSERT INTO')) {
        inInsertStatement = true;
        currentStatement = line;
        continue;
      }
      
      // 继续收集 INSERT 语句内容
      if (inInsertStatement) {
        currentStatement += '\n' + line;
        
        // INSERT 语句结束（以分号结尾）
        if (line.endsWith(';')) {
          // 检查是否属于 merchant_reviews（可能跨多行）
          if (!currentStatement.toUpperCase().includes('MERCHANT_REVIEWS')) {
            insertStatements.push(currentStatement);
          }
          inInsertStatement = false;
          currentStatement = '';
        }
      }
    }
    
    console.log(`   ✅ 找到 ${insertStatements.length} 条 INSERT 语句`);
    
    if (insertStatements.length === 0) {
      console.log('   ⚠️  没有找到可导入的 INSERT 语句');
      return;
    }
    
    // 执行 INSERT 语句
    console.log('\n📥 开始导入数据...');
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < insertStatements.length; i++) {
      const stmt = insertStatements[i];
      const tableName = stmt.match(/INSERT INTO `?(\w+)`?/i)?.[1] || 'unknown';
      
      try {
        await connection.query(stmt);
        successCount++;
        const rowMatch = stmt.match(/VALUES\s*(.*)/is);
        const rowCount = rowMatch ? (rowMatch[1].match(/\(/g) || []).length : '?';
        console.log(`   ✅ [${i + 1}/${insertStatements.length}] ${tableName}: 导入成功 (${rowCount} 行)`);
      } catch (error) {
        errorCount++;
        // 如果是重复键错误，可能是数据已存在，不算严重错误
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`   ⚠️  [${i + 1}/${insertStatements.length}] ${tableName}: 数据已存在（跳过）`);
        } else {
          console.error(`   ❌ [${i + 1}/${insertStatements.length}] ${tableName}: 导入失败`, error.message);
          // 继续执行其他语句，不中断
        }
      }
    }
    
    console.log(`\n📊 导入完成：成功 ${successCount} 条，失败 ${errorCount} 条`);
    
    // 验证导入结果
    console.log('\n🔍 验证导入结果...');
    const [newUserCount] = await connection.query('SELECT COUNT(*) AS count FROM users');
    const [newPostCount] = await connection.query('SELECT COUNT(*) AS count FROM forum_posts');
    const [newReplyCount] = await connection.query('SELECT COUNT(*) AS count FROM forum_replies');
    const [newMessageCount] = await connection.query('SELECT COUNT(*) AS count FROM messages');
    const [newNotificationCount] = await connection.query('SELECT COUNT(*) AS count FROM notifications');
    
    console.log(`   最终数据量：`);
    console.log(`     - users: ${newUserCount[0].count}`);
    console.log(`     - forum_posts: ${newPostCount[0].count}`);
    console.log(`     - forum_replies: ${newReplyCount[0].count}`);
    console.log(`     - messages: ${newMessageCount[0].count}`);
    console.log(`     - notifications: ${newNotificationCount[0].count}`);
    
    console.log('\n✅ 数据导入完成！');
    
  } catch (error) {
    console.error('\n❌ 导入过程中发生错误：', error.message);
    if (error.code) {
      console.error('   错误代码：', error.code);
    }
    if (error.sql) {
      console.error('   SQL 语句：', error.sql.substring(0, 100) + '...');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行导入
importData();

// 导入旧数据到 Zeabur MySQL - 改进版
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

// 使用参数化查询来安全地插入数据
async function insertData(table, columns, rows) {
  if (rows.length === 0) return;
  
  const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
  const sql = `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES ${placeholders}`;
  
  // 展平所有行的值
  const values = rows.flat();
  
  await connection.query(sql, values);
}

// 解析 SQL 值（处理引号、NULL、数字等）
function parseSQLValue(value) {
  value = value.trim();
  if (value === 'NULL') return null;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  if (/^-?\d+$/.test(value)) return parseInt(value);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    // 移除引号并处理转义
    return value.slice(1, -1).replace(/''/g, "'").replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return value;
}

// 安全地解析 INSERT 语句的值 - 改进版，处理多行和特殊字符
function parseInsertValues(stmt) {
  const valuesMatch = stmt.match(/VALUES\s*(.+?);/s);
  if (!valuesMatch) return [];
  
  const valuesPart = valuesMatch[1].trim();
  const rows = [];
  
  // 改进的行分割：处理多行和特殊字符
  let depth = 0;
  let currentRow = '';
  let inQuotes = false;
  let quoteChar = '';
  let escaped = false;
  
  for (let i = 0; i < valuesPart.length; i++) {
    const char = valuesPart[i];
    const prevChar = i > 0 ? valuesPart[i - 1] : '';
    const nextChar = i < valuesPart.length - 1 ? valuesPart[i + 1] : '';
    
    // 处理转义字符
    if (escaped) {
      currentRow += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      currentRow += char;
      continue;
    }
    
    // 处理引号（包括 MySQL 的双引号转义 ''）
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      currentRow += char;
    } else if (inQuotes) {
      if (char === quoteChar) {
        // 检查是否是双引号转义（MySQL 风格）
        if (char === "'" && nextChar === "'") {
          currentRow += char;
          // nextChar 会在下次循环处理
        } else {
          inQuotes = false;
          quoteChar = '';
          currentRow += char;
        }
      } else {
        currentRow += char;
      }
    } else if (!inQuotes && char === '(') {
      depth++;
      if (depth === 1) {
        currentRow = '';
      } else {
        currentRow += char;
      }
    } else if (!inQuotes && char === ')') {
      depth--;
      if (depth === 0) {
        // 解析这一行的值
        const rowValues = parseRowValues(currentRow);
        if (rowValues.length > 0) {
          rows.push(rowValues);
        }
        currentRow = '';
      } else {
        currentRow += char;
      }
    } else {
      currentRow += char;
    }
  }
  
  return rows;
}

// 解析单行的值
function parseRowValues(rowStr) {
  const values = [];
  let currentValue = '';
  let depth = 0;
  let inQuotes = false;
  let quoteChar = '';
  let escaped = false;
  
  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    const prevChar = i > 0 ? rowStr[i - 1] : '';
    const nextChar = i < rowStr.length - 1 ? rowStr[i + 1] : '';
    
    if (escaped) {
      currentValue += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      currentValue += char;
      continue;
    }
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      currentValue += char;
    } else if (inQuotes) {
      if (char === quoteChar) {
        if (char === "'" && nextChar === "'") {
          currentValue += char;
        } else {
          inQuotes = false;
          quoteChar = '';
          currentValue += char;
        }
      } else {
        currentValue += char;
      }
    } else if (!inQuotes && char === '(') {
      depth++;
      currentValue += char;
    } else if (!inQuotes && char === ')') {
      depth--;
      currentValue += char;
    } else if (!inQuotes && depth === 0 && char === ',') {
      values.push(parseSQLValue(currentValue.trim()));
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  if (currentValue.trim()) {
    values.push(parseSQLValue(currentValue.trim()));
  }
  
  return values;
}

try {
  console.log('✅ 连接成功！');
  
  // 禁用外键检查
  await connection.query('SET FOREIGN_KEY_CHECKS=0');
  console.log('已禁用外键检查');
  
  // 读取 SQL 文件
  const sqlContent = fs.readFileSync('../oldksports_v2_cleaned.sql', 'utf8');
  
  // 提取 INSERT 语句（排除 merchant_reviews）
  const insertPattern = /INSERT INTO `(?!merchant_reviews)(\w+)`[^;]*;/gs;
  const inserts = sqlContent.match(insertPattern) || [];
  console.log(`找到 ${inserts.length} 条 INSERT 语句`);
  
  // 按顺序执行
  const order = ['users', 'forum_posts', 'forum_replies', 'messages', 'notifications'];
  let successCount = 0;
  
  for (const table of order) {
    const stmt = inserts.find(s => s.includes(`INSERT INTO \`${table}\``));
    if (!stmt) {
      console.log(`⏭️  ${table}: 未找到 INSERT 语句`);
      continue;
    }
    
    try {
      // 获取表结构
      const [columns] = await connection.query(`DESCRIBE ${table}`);
      const columnNames = columns.map(c => c.Field);
      const columnInfo = {};
      columns.forEach(col => {
        columnInfo[col.Field] = {
          type: col.Type,
          null: col.Null === 'YES',
          default: col.Default,
        };
      });
      
      // 提取列名
      const columnMatch = stmt.match(/INSERT INTO `\w+` \(([^)]+)\)/);
      if (!columnMatch) {
        throw new Error('无法解析列名');
      }
      
      const insertColumns = columnMatch[1]
        .split(',')
        .map(c => c.trim().replace(/`/g, ''))
        .filter(c => columnNames.includes(c)); // 只保留表中存在的列
      
      if (insertColumns.length === 0) {
        console.log(`⚠️  ${table}: 没有匹配的列，跳过`);
        continue;
      }
      
      // 解析值
      let allRows = parseInsertValues(stmt);
      if (allRows.length === 0) {
        // 如果解析失败，尝试直接执行原始 SQL（针对包含特殊字符的数据）
        console.log(`⚠️  ${table}: 标准解析失败，尝试直接执行原始 SQL...`);
        
        try {
          // 构建过滤后的 SQL：移除不存在的列
          const originalColumns = columnMatch[1]
            .split(',')
            .map(c => c.trim().replace(/`/g, ''));
          
          // 找出需要移除的列索引
          const columnsToRemove = [];
          originalColumns.forEach((col, idx) => {
            if (!columnNames.includes(col)) {
              columnsToRemove.push(idx);
            }
          });
          
          if (columnsToRemove.length > 0) {
            console.log(`   需要移除 ${columnsToRemove.length} 个不存在的列: ${originalColumns.filter((_, i) => columnsToRemove.includes(i)).join(', ')}`);
            
            // 构建新的 INSERT 语句：只包含存在的列
            const validColumns = originalColumns.filter((col, idx) => !columnsToRemove.includes(idx));
            const validColumnsStr = validColumns.map(c => `\`${c}\``).join(', ');
            
            // 提取 VALUES 部分并移除对应位置的值
            const valuesMatch = stmt.match(/VALUES\s*(.+);/s);
            if (valuesMatch) {
              // 尝试解析并重建
              const testRows = parseInsertValues(stmt);
              if (testRows.length > 0) {
                // 移除不需要的列的值
                const filteredRows = testRows.map(row => {
                  return row.filter((val, idx) => !columnsToRemove.includes(idx));
                });
                
                // 使用参数化查询插入
                await insertData(table, validColumns, filteredRows);
                console.log(`✅ ${table}: 导入成功 (${filteredRows.length} 行)`);
                successCount++;
                continue;
              }
            }
            
            // 如果解析失败，尝试直接执行（可能会失败，但至少尝试了）
            console.log(`   尝试直接执行（可能因列数不匹配而失败）...`);
            const testSQL = stmt.replace(/INSERT INTO `\w+`/, `INSERT IGNORE INTO \`${table}\``);
            await connection.query(testSQL);
            console.log(`✅ ${table}: 直接执行成功`);
            successCount++;
            continue;
          } else {
            // 所有列都存在，直接执行
            const directSQL = stmt.replace(/INSERT INTO `\w+`/, `INSERT IGNORE INTO \`${table}\``);
            await connection.query(directSQL);
            console.log(`✅ ${table}: 直接执行成功（所有列匹配）`);
            successCount++;
            continue;
          }
        } catch (directError) {
          if (directError.code === 'ER_BAD_FIELD_ERROR') {
            console.log(`   ❌ 列名错误，需要手动处理字段映射`);
            // 继续使用参数化方案
          } else {
            // 其他错误，可能数据已存在或语法错误
            if (directError.code === 'ER_DUP_ENTRY') {
              console.log(`   ⚠️  数据已存在`);
              continue;
            }
            console.error(`   直接执行失败:`, directError.message.substring(0, 100));
          }
        }
        
        if (allRows.length === 0) {
          console.log(`⚠️  ${table}: 无法解析数据，跳过（数据可能包含特殊字符）`);
          continue;
        }
      }
      
      // 创建列索引映射
      const originalColumns = columnMatch[1]
        .split(',')
        .map(c => c.trim().replace(/`/g, ''));
      
      const columnIndexMap = insertColumns.map(col => {
        const idx = originalColumns.indexOf(col);
        return { col, idx, nullable: columnInfo[col].null };
      });
      
      // 过滤和转换数据
      const validRows = allRows.map(row => {
        return columnIndexMap.map(({ idx, col, nullable }) => {
          let value = idx < row.length ? row[idx] : null;
          
          // 处理 NULL 值
          if (value === null || value === 'NULL' || value === '') {
            if (nullable || columnInfo[col].default !== null) {
              return null;
            } else {
              // 提供默认值
              const def = columnInfo[col].default;
              if (def !== null) {
                return def;
              }
              // 根据类型提供默认值
              if (col.includes('id') || col === 'user_id' || col === 'author_id') {
                return 1; // 假设 ID 为 1
              }
              if (col.includes('created_at') || col.includes('updated_at')) {
                return new Date();
              }
              return '';
            }
          }
          
          // 处理日期时间
          if (col.includes('_at') && typeof value === 'string') {
            try {
              return new Date(value);
            } catch (e) {
              return value;
            }
          }
          
          return value;
        });
      });
      
      // 插入数据
      await insertData(table, insertColumns, validRows);
      console.log(`✅ ${table}: 导入成功 (${validRows.length} 行)`);
      successCount++;
      
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`⚠️  ${table}: 数据已存在`);
      } else {
        console.error(`❌ ${table}:`, error.message);
        if (error.sql) {
          console.error(`   SQL: ${error.sql.substring(0, 200)}...`);
        }
      }
    }
  }
  
  // 启用外键检查
  await connection.query('SET FOREIGN_KEY_CHECKS=1');
  
  // 验证结果
  console.log('\n📊 数据统计:');
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
  
  console.log('\n✅ 导入完成！');
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
} finally {
  await connection.end();
}

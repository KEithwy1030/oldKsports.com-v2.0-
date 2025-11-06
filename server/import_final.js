// 最终导入脚本：直接导入最重要的三个表
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

// 简化的SQL值解析函数
function parseSQLValue(str, startPos) {
  str = str.trim();
  if (str[startPos] === "'" || str[startPos] === '"') {
    const quote = str[startPos];
    let pos = startPos + 1;
    let value = '';
    while (pos < str.length) {
      if (str[pos] === '\\' && pos + 1 < str.length) {
        value += str[pos] + str[pos + 1];
        pos += 2;
      } else if (str[pos] === quote) {
        if (pos + 1 < str.length && str[pos + 1] === quote) {
          value += quote;
          pos += 2;
        } else {
          return { value: value, endPos: pos + 1 };
        }
      } else {
        value += str[pos];
        pos++;
      }
    }
    return { value: value, endPos: pos };
  } else if (str[startPos] >= '0' && str[startPos] <= '9' || str[startPos] === '-') {
    let pos = startPos;
    let value = '';
    while (pos < str.length && (str[pos] >= '0' && str[pos] <= '9' || str[pos] === '-' || str[pos] === '.')) {
      value += str[pos];
      pos++;
    }
    return { value: value, endPos: pos };
  } else if (str.substring(startPos, startPos + 4).toUpperCase() === 'NULL') {
    return { value: null, endPos: startPos + 4 };
  } else {
    let pos = startPos;
    let value = '';
    while (pos < str.length && str[pos] !== ',' && str[pos] !== ')') {
      value += str[pos];
      pos++;
    }
    return { value: value.trim(), endPos: pos };
  }
}

// 解析一行VALUES数据
function parseRow(rowStr, columnCount) {
  rowStr = rowStr.trim();
  if (!rowStr.startsWith('(') || !rowStr.endsWith(')')) {
    return null;
  }
  
  const values = [];
  let pos = 1; // 跳过开头的(
  
  while (pos < rowStr.length - 1) {
    // 跳过空白和逗号
    while (pos < rowStr.length - 1 && (rowStr[pos] === ' ' || rowStr[pos] === '\t' || rowStr[pos] === '\n' || rowStr[pos] === ',')) {
      pos++;
    }
    
    if (pos >= rowStr.length - 1) break;
    
    const result = parseSQLValue(rowStr, pos);
    values.push(result.value);
    pos = result.endPos;
  }
  
  return values.length === columnCount ? values : null;
}

// 提取完整的INSERT语句（跨多行）
function extractInsertStatement(lines, startLine, tableName) {
  let currentLine = startLine;
  let insertStmt = '';
  
  // 找到INSERT INTO `tableName`的行
  while (currentLine < lines.length) {
    const line = lines[currentLine];
    if (line.includes(`INSERT INTO \`${tableName}\``)) {
      insertStmt = line;
      currentLine++;
      break;
    }
    currentLine++;
  }
  
  if (!insertStmt) return null;
  
  // 继续读取直到找到分号
  while (currentLine < lines.length) {
    const line = lines[currentLine];
    insertStmt += '\n' + line;
    if (line.trim().endsWith(';')) {
      break;
    }
    currentLine++;
  }
  
  return insertStmt.trim().endsWith(';') ? insertStmt : null;
}

try {
  console.log('✅ 连接成功！\n');
  
  // 逐行读取原始SQL文件
  const lines = fs.readFileSync('../oldksports.sql', 'utf8').split('\n');
  console.log('✅ 已读取原始SQL文件\n');
  
  // 清空表
  console.log('🗑️  清空现有数据...\n');
  await connection.query('SET FOREIGN_KEY_CHECKS=0;');
  await connection.query('DELETE FROM `forum_replies`');
  await connection.query('DELETE FROM `forum_posts`');
  await connection.query('DELETE FROM `users`');
  console.log('  ✅ 表已清空\n');
  
  // 导入users表
  console.log('📝 导入 users 表...\n');
  let lineIndex = 0;
  let allUserRows = [];
  let newCols = null;
  let colMap = null;
  
  while (lineIndex < lines.length) {
    if (lines[lineIndex].includes('INSERT INTO `users`')) {
      const usersSQL = extractInsertStatement(lines, lineIndex, 'users');
      if (usersSQL) {
        console.log(`  找到INSERT语句，开始行: ${lineIndex + 1}`);
        const colMatch = usersSQL.match(/INSERT INTO `users`\s*\(([^)]+)\)/);
        if (colMatch) {
          const oldCols = colMatch[1].split(',').map(c => c.trim().replace(/`/g, '').replace(/\s+/g, ' '));
          // 新数据库的列（只在第一次时设置）
          if (!newCols) {
            newCols = ['id', 'username', 'email', 'password', 'points', 'level', 'join_date', 'last_login', 'is_admin', 'roles', 'img', 'avatar', 'has_uploaded_avatar', 'created_at', 'updated_at', 'reset_token', 'reset_token_expires'];
            colMap = newCols.map(col => oldCols.indexOf(col));
          }
          
                     // 提取VALUES部分
           const valuesMatch = usersSQL.match(/VALUES\s*(.+);?$/s);
           if (valuesMatch) {
             const valuesPart = valuesMatch[1].trim();
             // 改进的解析：查找所有完整的括号对
             const rows = [];
             let currentRow = '';
             let depth = 0;
             let inString = false;
             let stringChar = '';
             let rowStart = -1;
             
             for (let i = 0; i < valuesPart.length; i++) {
               const char = valuesPart[i];
               const prevChar = i > 0 ? valuesPart[i - 1] : '';
               
               if (!inString && (char === "'" || char === '"')) {
                 inString = true;
                 stringChar = char;
                 if (rowStart === -1 && depth === 0) {
                   // 查找第一个开括号
                   continue;
                 }
                 currentRow += char;
               } else if (inString && char === stringChar && prevChar !== '\\') {
                 inString = false;
                 stringChar = '';
                 currentRow += char;
               } else if (!inString && char === '(') {
                 if (depth === 0) {
                   rowStart = i;
                   currentRow = '(';
                 } else {
                   currentRow += char;
                 }
                 depth++;
               } else if (!inString && char === ')') {
                 depth--;
                 currentRow += char;
                 if (depth === 0) {
                   // 完整的一行
                   const parsed = parseRow(currentRow, oldCols.length);
                   if (parsed) {
                     const newRow = colMap.map(idx => idx >= 0 ? parsed[idx] : null);
                     rows.push(newRow);
                   }
                   currentRow = '';
                   rowStart = -1;
                   // 跳过逗号、分号和空白
                   while (i + 1 < valuesPart.length && 
                          (valuesPart[i + 1] === ',' || 
                           valuesPart[i + 1] === ';' || 
                           valuesPart[i + 1] === ' ' || 
                           valuesPart[i + 1] === '\t' || 
                           valuesPart[i + 1] === '\n' || 
                           valuesPart[i + 1] === '\r')) {
                     i++;
                   }
                 }
               } else {
                 if (rowStart !== -1) {
                   currentRow += char;
                 }
               }
             }
             
                          console.log(`  解析到 ${rows.length} 行数据`);
             // 合并所有行的数据
             allUserRows = allUserRows.concat(rows.map(row => {
               const newRow = colMap.map(idx => idx >= 0 ? row[idx] : null);
               return newRow;
             }));
           }
        }
      }
    }
    lineIndex++;
  }
  
  // 批量插入所有users数据
  if (allUserRows.length > 0) {
    console.log(`  总共解析到 ${allUserRows.length} 行数据，开始插入...\n`);
    const placeholders = newCols.map(() => '?').join(',');
    const sql = `INSERT INTO \`users\` (\`${newCols.join('`, `')}\`) VALUES (${placeholders})`;
    
         // 找到roles字段、created_at字段和updated_at字段的索引
     const rolesIndex = newCols.indexOf('roles');
     const createdAtIndex = newCols.indexOf('created_at');
     const updatedAtIndex = newCols.indexOf('updated_at');
     
     for (const row of allUserRows) {
       // 修复created_at字段：如果为NULL，设置为当前时间
       if (createdAtIndex >= 0 && (row[createdAtIndex] === null || row[createdAtIndex] === undefined || row[createdAtIndex] === '')) {
         row[createdAtIndex] = new Date().toISOString().slice(0, 19).replace('T', ' ');
       }
       
       // 修复updated_at字段：如果为NULL，设置为当前时间
       if (updatedAtIndex >= 0 && (row[updatedAtIndex] === null || row[updatedAtIndex] === undefined || row[updatedAtIndex] === '')) {
         row[updatedAtIndex] = new Date().toISOString().slice(0, 19).replace('T', ' ');
       }
       
       // 修复roles字段：如果不是有效JSON，则设置为NULL或空数组
       if (rolesIndex >= 0 && row[rolesIndex] !== null && row[rolesIndex] !== undefined) {
        const rolesValue = row[rolesIndex];
        if (typeof rolesValue === 'string') {
          try {
            JSON.parse(rolesValue);
            // 已经是有效JSON，无需修改
          } catch (e) {
            // 不是有效JSON，设置为NULL或空数组
            if (rolesValue.trim() === '' || rolesValue === 'null') {
              row[rolesIndex] = null;
            } else {
              // 尝试转换为JSON数组
              try {
                row[rolesIndex] = JSON.stringify([rolesValue]);
              } catch (e2) {
                row[rolesIndex] = null;
              }
            }
          }
        }
      }
      
      try {
        await connection.query(sql, row);
      } catch (err) {
        // 忽略重复键错误
        if (err.code !== 'ER_DUP_ENTRY') {
          console.error(`  插入失败: ${err.message}`);
        }
      }
    }
    
         const [count] = await connection.query('SELECT COUNT(*) AS c FROM users');
     console.log(`  ✅ users: ${count[0].c} 条记录\n`);
   } else {
     console.log(`  ⚠️  未找到users数据\n`);
   }
  
  // 导入forum_posts表
  console.log('📝 导入 forum_posts 表...\n');
  lineIndex = 0;
  while (lineIndex < lines.length) {
    if (lines[lineIndex].includes('INSERT INTO `forum_posts`')) {
      const postsSQL = extractInsertStatement(lines, lineIndex, 'forum_posts');
      if (postsSQL) {
        // ... existing code for forum_posts ...
        const colMatch = postsSQL.match(/INSERT INTO `forum_posts`\s*\(([^)]+)\)/);
        if (colMatch) {
          const oldCols = colMatch[1].split(',').map(c => c.trim().replace(/`/g, '').replace(/\s+/g, ' '));
          const newCols = ['id', 'author_id', 'title', 'content', 'created_at', 'updated_at', 'views', 'likes'];
          const colMap = newCols.map(col => oldCols.indexOf(col));
          
                     const valuesMatch = postsSQL.match(/VALUES\s*(.+);?$/s);
           if (valuesMatch) {
             const valuesPart = valuesMatch[1].trim();
             const rows = [];
             let currentRow = '';
             let depth = 0;
             let inString = false;
             let stringChar = '';
             let rowStart = -1;
             
             for (let i = 0; i < valuesPart.length; i++) {
               const char = valuesPart[i];
               const prevChar = i > 0 ? valuesPart[i - 1] : '';
               
               if (!inString && (char === "'" || char === '"')) {
                 inString = true;
                 stringChar = char;
                 if (rowStart === -1 && depth === 0) continue;
                 currentRow += char;
               } else if (inString && char === stringChar && prevChar !== '\\') {
                 inString = false;
                 stringChar = '';
                 currentRow += char;
               } else if (!inString && char === '(') {
                 if (depth === 0) {
                   rowStart = i;
                   currentRow = '(';
                 } else {
                   currentRow += char;
                 }
                 depth++;
               } else if (!inString && char === ')') {
                 depth--;
                 currentRow += char;
                 if (depth === 0) {
                   const parsed = parseRow(currentRow, oldCols.length);
                   if (parsed) {
                     const newRow = colMap.map(idx => idx >= 0 ? parsed[idx] : null);
                     rows.push(newRow);
                   }
                   currentRow = '';
                   rowStart = -1;
                   while (i + 1 < valuesPart.length && 
                          (valuesPart[i + 1] === ',' || 
                           valuesPart[i + 1] === ';' || 
                           valuesPart[i + 1] === ' ' || 
                           valuesPart[i + 1] === '\t' || 
                           valuesPart[i + 1] === '\n' || 
                           valuesPart[i + 1] === '\r')) {
                     i++;
                   }
                 }
               } else {
                 if (rowStart !== -1) {
                   currentRow += char;
                 }
               }
             }
            
            if (rows.length > 0) {
              const placeholders = newCols.map(() => '?').join(',');
              const sql = `INSERT INTO \`forum_posts\` (\`${newCols.join('`, `')}\`) VALUES (${placeholders})`;
              
              for (const row of rows) {
                try {
                  await connection.query(sql, row);
                } catch (err) {
                  if (err.code !== 'ER_DUP_ENTRY') {
                    console.error(`  插入失败: ${err.message}`);
                  }
                }
              }
              
              const [count] = await connection.query('SELECT COUNT(*) AS c FROM forum_posts');
              console.log(`  ✅ forum_posts: ${count[0].c} 条记录\n`);
              break;
            }
          }
        }
      }
    }
    lineIndex++;
  }
  
  // 导入forum_replies表（使用相同的方法）
  console.log('📝 导入 forum_replies 表...\n');
  lineIndex = 0;
  while (lineIndex < lines.length) {
    if (lines[lineIndex].includes('INSERT INTO `forum_replies`')) {
      const repliesSQL = extractInsertStatement(lines, lineIndex, 'forum_replies');
      if (repliesSQL) {
        // ... existing code for forum_replies ...
        const colMatch = repliesSQL.match(/INSERT INTO `forum_replies`\s*\(([^)]+)\)/);
        if (colMatch) {
          const oldCols = colMatch[1].split(',').map(c => c.trim().replace(/`/g, '').replace(/\s+/g, ' '));
          const newCols = ['id', 'post_id', 'author_id', 'content', 'created_at', 'updated_at'];
          const colMap = newCols.map(col => oldCols.indexOf(col));
          
                     const valuesMatch = repliesSQL.match(/VALUES\s*(.+);?$/s);
           if (valuesMatch) {
             const valuesPart = valuesMatch[1].trim();
             const rows = [];
             let currentRow = '';
             let depth = 0;
             let inString = false;
             let stringChar = '';
             let rowStart = -1;
             
             for (let i = 0; i < valuesPart.length; i++) {
               const char = valuesPart[i];
               const prevChar = i > 0 ? valuesPart[i - 1] : '';
               
               if (!inString && (char === "'" || char === '"')) {
                 inString = true;
                 stringChar = char;
                 if (rowStart === -1 && depth === 0) continue;
                 currentRow += char;
               } else if (inString && char === stringChar && prevChar !== '\\') {
                 inString = false;
                 stringChar = '';
                 currentRow += char;
               } else if (!inString && char === '(') {
                 if (depth === 0) {
                   rowStart = i;
                   currentRow = '(';
                 } else {
                   currentRow += char;
                 }
                 depth++;
               } else if (!inString && char === ')') {
                 depth--;
                 currentRow += char;
                 if (depth === 0) {
                   const parsed = parseRow(currentRow, oldCols.length);
                   if (parsed) {
                     const newRow = colMap.map(idx => idx >= 0 ? parsed[idx] : null);
                     rows.push(newRow);
                   }
                   currentRow = '';
                   rowStart = -1;
                   while (i + 1 < valuesPart.length && 
                          (valuesPart[i + 1] === ',' || 
                           valuesPart[i + 1] === ';' || 
                           valuesPart[i + 1] === ' ' || 
                           valuesPart[i + 1] === '\t' || 
                           valuesPart[i + 1] === '\n' || 
                           valuesPart[i + 1] === '\r')) {
                     i++;
                   }
                 }
               } else {
                 if (rowStart !== -1) {
                   currentRow += char;
                 }
               }
             }
            
            if (rows.length > 0) {
              const placeholders = newCols.map(() => '?').join(',');
              const sql = `INSERT INTO \`forum_replies\` (\`${newCols.join('`, `')}\`) VALUES (${placeholders})`;
              
              for (const row of rows) {
                try {
                  await connection.query(sql, row);
                } catch (err) {
                  if (err.code !== 'ER_DUP_ENTRY') {
                    console.error(`  插入失败: ${err.message}`);
                  }
                }
              }
              
              const [count] = await connection.query('SELECT COUNT(*) AS c FROM forum_replies');
              console.log(`  ✅ forum_replies: ${count[0].c} 条记录\n`);
              break;
            }
          }
        }
      }
    }
    lineIndex++;
  }
  
  await connection.query('SET FOREIGN_KEY_CHECKS=1;');
  
  // 最终统计
  console.log('📊 最终统计:\n');
  const [users] = await connection.query('SELECT COUNT(*) AS c FROM users');
  const [posts] = await connection.query('SELECT COUNT(*) AS c FROM forum_posts');
  const [replies] = await connection.query('SELECT COUNT(*) AS c FROM forum_replies');
  
  console.log(`  users: ${users[0].c}`);
  console.log(`  forum_posts: ${posts[0].c}`);
  console.log(`  forum_replies: ${replies[0].c}`);
  
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

// 预处理旧数据SQL文件，使其符合新数据库结构
import fs from 'fs';

console.log('📋 开始预处理SQL文件...\n');

// 新数据库字段列表（从Zeabur数据库实际结构中获取）
const newSchema = {
  users: ['id', 'username', 'email', 'password', 'points', 'level', 'join_date', 'last_login', 'is_admin', 'roles', 'img', 'avatar', 'has_uploaded_avatar', 'created_at', 'updated_at', 'reset_token', 'reset_token_expires'],
  forum_posts: ['id', 'author_id', 'title', 'content', 'created_at', 'updated_at', 'views', 'likes'],
  forum_replies: ['id', 'post_id', 'author_id', 'content', 'created_at', 'updated_at'],
  messages: ['id', 'sender_id', 'recipient_id', 'content', 'is_read', 'created_at'],
  notifications: ['id', 'user_id', 'type', 'content', 'is_read', 'created_at'],
};

console.log('✅ 使用新数据库字段列表');
console.log(`   users表字段: ${newSchema.users.length} 个`);
console.log(`   forum_posts表字段: ${newSchema.forum_posts.length} 个`);
console.log(`   forum_replies表字段: ${newSchema.forum_replies.length} 个`);
console.log(`   messages表字段: ${newSchema.messages.length} 个`);
console.log(`   notifications表字段: ${newSchema.notifications.length} 个`);

console.log('\n📝 逐行处理SQL文件...\n');

// 逐行读取旧SQL文件
const lines = fs.readFileSync('../oldksports.sql', 'utf8').split('\n');

const outputLines = [];
outputLines.push('-- 预处理后的SQL文件，可直接导入到Zeabur数据库');
outputLines.push('-- 生成时间: ' + new Date().toISOString());
outputLines.push('');
outputLines.push('SET FOREIGN_KEY_CHECKS=0;');
outputLines.push('');

// 处理状态
let currentTable = null;
let currentInsert = null;
let inValues = false;
let valuesLines = [];
let tableData = {
  users: [],
  forum_posts: [],
  forum_replies: [],
  messages: [],
  notifications: [],
};

// 逐行处理
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // 检查是否是INSERT语句开始
  const insertMatch = line.match(/INSERT INTO `(\w+)`/);
  if (insertMatch) {
    // 保存之前的数据
    if (currentTable && currentInsert) {
      const fullInsert = currentInsert + '\n' + valuesLines.join('\n');
      if (tableData[currentTable]) {
        tableData[currentTable].push(fullInsert);
      }
    }
    
    // 开始新的INSERT
    currentTable = insertMatch[1];
    currentInsert = line;
    inValues = line.includes('VALUES');
    valuesLines = [];
    
    if (inValues) {
      const valuesPart = line.split('VALUES')[1];
      if (valuesPart.trim()) {
        valuesLines.push(valuesPart.trim());
      }
    }
    continue;
  }
  
  // 如果正在处理INSERT
  if (currentTable && currentInsert) {
    if (!inValues && line.match(/^\s*VALUES\s*$/i)) {
      inValues = true;
      continue;
    }
    
    if (inValues) {
      valuesLines.push(line);
      
      // 检查是否是INSERT语句结束
      if (line.endsWith(';')) {
        // 保存完整INSERT
        const fullInsert = currentInsert + '\n' + valuesLines.join('\n');
        if (tableData[currentTable]) {
          tableData[currentTable].push(fullInsert);
        }
        
        // 重置状态
        currentTable = null;
        currentInsert = null;
        inValues = false;
        valuesLines = [];
      }
    } else {
      currentInsert += ' ' + line;
    }
  }
}

// 处理最后一条INSERT
if (currentTable && currentInsert) {
  const fullInsert = currentInsert + '\n' + valuesLines.join('\n');
  if (tableData[currentTable]) {
    tableData[currentTable].push(fullInsert);
  }
}

// 处理每个表的数据
const tables = ['users', 'forum_posts', 'forum_replies', 'messages', 'notifications'];

for (const table of tables) {
  const inserts = tableData[table];
  if (!inserts || inserts.length === 0) {
    console.log(`⏭️  ${table}: 未找到数据`);
    continue;
  }
  
  console.log(`处理 ${table} 表...`);
  console.log(`  找到 ${inserts.length} 条INSERT语句`);
  
  const newColumns = newSchema[table] || [];
  
  // 合并所有INSERT语句的数据
  let allRows = [];
  let oldColumns = [];
  
  for (const insertStmt of inserts) {
    // 提取列名
    const columnMatch = insertStmt.match(/INSERT INTO `\w+` \(([^)]+)\)/);
    if (columnMatch) {
      const cols = columnMatch[1]
        .split(',')
        .map(c => c.trim().replace(/`/g, ''));
      
      if (oldColumns.length === 0) {
        oldColumns = cols;
      } else if (oldColumns.join(',') !== cols.join(',')) {
        console.log(`  ⚠️  列名不一致，使用第一条的列名`);
      }
      
      // 提取VALUES部分
      const valuesMatch = insertStmt.match(/VALUES\s*(.+);?$/s);
      if (valuesMatch) {
        const valuesPart = valuesMatch[1].trim();
        
        // 简单解析：查找所有以(开头，)结尾的行
        const rowPattern = /\([^)]+(?:\([^)]*\)[^)]*)*\)/g;
        const rowMatches = valuesPart.matchAll(rowPattern);
        
        for (const match of rowMatches) {
          const rowStr = match[0];
          // 简单分割值（按逗号，但要注意引号内的逗号）
          const values = [];
          let current = '';
          let inQuotes = false;
          let quoteChar = '';
          
          for (let j = 1; j < rowStr.length - 1; j++) {
            const char = rowStr[j];
            const nextChar = j < rowStr.length - 1 ? rowStr[j + 1] : '';
            const prevChar = j > 0 ? rowStr[j - 1] : '';
            
            if (!inQuotes && (char === '"' || char === "'")) {
              inQuotes = true;
              quoteChar = char;
              current += char;
            } else if (inQuotes && char === quoteChar && nextChar !== quoteChar && prevChar !== '\\') {
              inQuotes = false;
              quoteChar = '';
              current += char;
            } else if (inQuotes && char === quoteChar && nextChar === quoteChar) {
              current += char;
              j++;
              current += quoteChar;
            } else if (!inQuotes && char === ',' && rowStr.substring(j - 10, j).match(/\)\s*$/)) {
              // 可能是嵌套括号结束后的逗号，需要特殊处理
              current += char;
            } else if (!inQuotes && char === ',') {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          if (current.trim()) {
            values.push(current.trim());
          }
          
          allRows.push(values);
        }
      }
    }
  }
  
  if (allRows.length === 0) {
    console.log(`  ⚠️  ${table}: 未能解析出数据行`);
    continue;
  }
  
  // 找出有效列
  const validColumns = oldColumns.filter(col => newColumns.includes(col));
  const columnsToRemove = oldColumns.filter(col => !newColumns.includes(col));
  
  if (columnsToRemove.length > 0) {
    console.log(`    移除 ${columnsToRemove.length} 个字段: ${columnsToRemove.join(', ')}`);
  }
  
  // 构建新的INSERT语句
  const columnIndexMap = validColumns.map(col => oldColumns.indexOf(col));
  
  const filteredRows = allRows.map(row => {
    const filteredValues = columnIndexMap.map(idx => {
      if (idx >= 0 && idx < row.length) {
        return row[idx];
      }
      return 'NULL';
    });
    return `(${filteredValues.join(', ')})`;
  });
  
  // 如果数据太多，分成多个INSERT语句
  const chunkSize = 10;
  for (let i = 0; i < filteredRows.length; i += chunkSize) {
    const chunk = filteredRows.slice(i, i + chunkSize);
    const newInsertStmt = `INSERT INTO \`${table}\` (\`${validColumns.join('`, `')}\`) VALUES\n  ${chunk.join(',\n  ')};`;
    outputLines.push(`-- ${table} 表数据 (${i + 1}-${Math.min(i + chunkSize, filteredRows.length)}/${filteredRows.length})`);
    outputLines.push(newInsertStmt);
    outputLines.push('');
  }
  
  console.log(`  ✅ ${table}: 处理完成，${allRows.length} 行数据`);
}

outputLines.push('SET FOREIGN_KEY_CHECKS=1;');

// 写入新文件
const outputFile = '../oldksports_processed.sql';
fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf8');

console.log(`\n✅ 预处理完成！`);
console.log(`📁 输出文件: ${outputFile}`);
console.log(`\n现在可以直接导入 ${outputFile} 到Zeabur数据库了！`);

# Zeabur Agent 数据库检查提示词

## 任务说明

请检查 Zeabur 生产环境的 MySQL 数据库，确认是否有新增的表或字段，并详细说明哪些是本次代码更新（commit: 3d17622）新增的。

## 检查步骤

### 1. 检查数据库表结构

执行以下 SQL 查询，获取所有表名：

```sql
SHOW TABLES;
```

### 2. 检查 users 表的新增字段

本次更新在 `users` 表中新增了以下字段，请检查这些字段是否存在：

**新增字段列表：**
- `register_ip` - VARCHAR(45) NULL DEFAULT NULL - 用户注册时的IP地址
- `last_login_ip` - VARCHAR(45) NULL DEFAULT NULL - 用户最后登录时的IP地址

执行以下查询检查：

```sql
-- 检查 users 表的字段
DESCRIBE users;

-- 或者使用 INFORMATION_SCHEMA 查询
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME IN ('register_ip', 'last_login_ip');
```

### 3. 对比代码中的定义

参考代码文件：
- `server/auto-migrate.js` (第 134-138 行) - 定义了新增字段的迁移逻辑
- `database_init_schema.sql` - 完整的数据库schema定义

### 4. 检查迁移脚本是否已执行

查看服务器日志，确认 `auto-migrate.js` 是否已执行并成功添加字段。查找以下日志信息：

- `✅ register_ip 字段已存在` 或 `🔧 添加 register_ip 字段...`
- `✅ last_login_ip 字段已存在` 或 `🔧 添加 last_login_ip 字段...`
- `[auto-migrate] 已添加 users.register_ip`
- `[auto-migrate] 已添加 users.last_login_ip`

## 预期结果

### 本次更新新增的内容：

**表：无新增表**

**字段（在现有表中新增）：**
1. **users.register_ip**
   - 类型：VARCHAR(45)
   - 允许NULL：是
   - 默认值：NULL
   - 位置：在 `last_login` 字段之后
   - 用途：记录用户注册时的IP地址

2. **users.last_login_ip**
   - 类型：VARCHAR(45)
   - 允许NULL：是
   - 默认值：NULL
   - 位置：在 `register_ip` 字段之后
   - 用途：记录用户最后登录时的IP地址

## 验证查询

执行以下查询验证字段是否正常工作：

```sql
-- 检查是否有数据已填充到新字段
SELECT 
    id,
    username,
    register_ip,
    last_login_ip,
    last_login
FROM users
WHERE register_ip IS NOT NULL 
   OR last_login_ip IS NOT NULL
LIMIT 10;
```

## 报告格式

请按以下格式报告检查结果：

```
## 数据库检查结果

### 表检查
- [ ] 是否有新增表：是/否
- [ ] 如果有，列出新增表名：

### 字段检查
- [ ] users.register_ip：存在/不存在
- [ ] users.last_login_ip：存在/不存在

### 迁移状态
- [ ] auto-migrate.js 是否已执行：是/否
- [ ] 迁移日志状态：

### 本次更新新增内容总结
1. 新增表：无
2. 新增字段：
   - users.register_ip（用户注册IP地址）
   - users.last_login_ip（用户最后登录IP地址）

### 注意事项
- 这两个字段都是可选的（允许NULL），不会影响现有数据
- 字段会在新用户注册和用户登录时自动填充
- 如果字段不存在，服务器启动时会自动添加（通过 auto-migrate.js）
```

## 如果字段不存在

如果检查发现字段不存在，说明：
1. 服务器可能还未重启（迁移脚本在服务器启动时执行）
2. 迁移脚本执行失败（需要查看错误日志）

解决方案：
- 等待服务器重启后自动迁移
- 或手动执行迁移脚本
- 检查服务器日志中的错误信息


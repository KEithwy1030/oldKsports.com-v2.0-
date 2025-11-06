# Zeabur Agent 诊断提示词

## 问题背景

网站在生产环境（Zeabur）出现了以下问题：

1. **API 500错误**：`GET /api/users/online/today` 返回 500 Internal Server Error
2. **身份标签同步问题**：用户在个人中心保存身份标签后，前端显示保存成功，但在论坛页面点击用户头像时，身份标签没有同步更新

## 请求诊断内容

### 1. 检查 `/api/users/online/today` 接口错误详情

**请执行以下检查：**

- [ ] 查看 Zeabur 后端服务的实时日志，找出 `/api/users/online/today` 接口返回 500 错误的具体原因
- [ ] 检查 SQL 查询是否执行失败，如果是，请提供完整的错误信息（包括 SQL 错误代码、错误消息）
- [ ] 确认生产环境数据库中 `users` 表是否包含以下字段：
  - `id`
  - `username`
  - `avatar`
  - `points`
  - `role` (重要：检查此字段是否存在)
  - `roles` (JSON 字段)
  - `last_login`
- [ ] 检查 `TIMESTAMPDIFF` 函数是否在生产环境的 MySQL 版本中可用
- [ ] 如果 `role` 字段不存在，请告知这是否是导致错误的原因

**相关代码位置：**
- 后端控制器：`server/controllers/user.controller.js` 第 316-377 行
- SQL 查询：
```sql
SELECT id, username, avatar, points, role, roles, last_login
FROM users 
WHERE last_login IS NOT NULL 
AND TIMESTAMPDIFF(HOUR, last_login, NOW()) <= 24
ORDER BY last_login DESC
LIMIT 20
```

### 2. 检查数据库表结构

**请执行以下检查：**

- [ ] 执行 `DESCRIBE users;` 或 `SHOW COLUMNS FROM users;`，查看 `users` 表的完整结构
- [ ] 确认以下字段的数据类型和约束：
  - `role` 字段是否存在？如果存在，类型是什么？
  - `roles` 字段的类型是否为 JSON？
  - `last_login` 字段是否存在？类型是什么？
- [ ] 检查是否有任何字段名不匹配的情况（例如：`last_login` vs `lastLogin`）

### 3. 检查用户信息更新逻辑

**请执行以下检查：**

- [ ] 查看 `/api/users/me` PUT 接口（更新用户资料）的日志，确认身份标签（roles）是否正确保存到数据库
- [ ] 检查 `updateUserProfile` 函数（`server/controllers/user.controller.js` 第 71-238 行）是否成功执行
- [ ] 确认 `roles` 字段在数据库中的存储格式（是否为有效的 JSON 字符串）
- [ ] 检查 `/api/users/:username` GET 接口（获取用户信息）返回的数据格式，确认 `roles` 字段是否正确解析

### 4. 提供解决方案建议

**基于以上检查结果，请提供：**

- [ ] 如果 `role` 字段不存在，建议的修复方案（移除查询中的 `role` 字段，或添加该字段）
- [ ] 如果 SQL 语法有问题，建议的兼容性修复方案
- [ ] 如果 `roles` 字段解析有问题，建议的数据格式修复方案
- [ ] 任何其他发现的问题和相应的修复建议

## 期望的输出格式

请 Zeabur agent 以以下格式反馈：

```markdown
## 诊断结果

### 1. API 错误详情
- **错误类型**：[具体错误类型]
- **错误消息**：[完整错误消息]
- **SQL 错误代码**：[如果有]
- **错误发生位置**：[具体代码行或函数]

### 2. 数据库表结构检查
- **users 表字段列表**：[列出所有字段]
- **role 字段状态**：[存在/不存在，类型，约束]
- **roles 字段状态**：[类型，是否可空]
- **last_login 字段状态**：[存在/不存在，类型]

### 3. 用户信息更新检查
- **roles 保存状态**：[是否成功保存]
- **roles 数据格式**：[JSON 字符串示例]
- **getUserInfo 返回格式**：[返回数据的示例]

### 4. 修复建议
- **问题1修复方案**：[具体修复步骤]
- **问题2修复方案**：[具体修复步骤]
- **代码修改建议**：[需要修改的代码位置和内容]
```

## 注意事项

- 请确保不泄露敏感信息（如数据库密码、JWT secret 等）
- 如果是字段不存在的问题，优先考虑修改代码以适配现有数据库结构
- 如果是数据库结构问题，请评估是否需要添加缺失的字段
- 请提供可以直接应用的代码修复方案

---

**请在 Zeabur 控制台或通过 Zeabur CLI 执行上述检查，并将结果反馈给我。**


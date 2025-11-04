# OldKSports 开发环境配置指南

## 🚀 快速启动

### 方法1：使用启动脚本（推荐）

```powershell
.\start-dev.ps1
```

### 方法2：手动启动

```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

## 📋 前置要求

1. **Docker Desktop** 已安装并运行
2. **MySQL数据库**：
   - 选项A：使用本地MySQL（默认配置）
   - 选项B：连接到Zeabur MySQL（需要配置环境变量）

## 🔧 配置说明

### 数据库配置

如果要连接到Zeabur的MySQL，需要设置环境变量：

**Windows PowerShell:**
```powershell
$env:MYSQL_HOST="hkg1.clusters.zeabur.com"
$env:MYSQL_PORT="31815"
$env:MYSQL_USERNAME="root"
$env:MYSQL_PASSWORD="your-password"
$env:MYSQL_DATABASE="oldksports"
```

**或在docker-compose.dev.yml中直接修改：**
```yaml
environment:
  - MYSQL_HOST=hkg1.clusters.zeabur.com
  - MYSQL_PORT=31815
  - MYSQL_USERNAME=root
  - MYSQL_PASSWORD=your-password
  - MYSQL_DATABASE=oldksports
```

### 端口配置

- **前端**: http://localhost:5173
- **后端**: http://localhost:8080

## 🛠️ 常用命令

### 查看日志
```bash
# 查看所有服务日志
docker-compose -f docker-compose.dev.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f backend
```

### 停止服务
```bash
docker-compose -f docker-compose.dev.yml down
```

### 重启服务
```bash
docker-compose -f docker-compose.dev.yml restart
```

### 重建容器
```bash
docker-compose -f docker-compose.dev.yml up -d --build --force-recreate
```

## 🔍 故障排除

### 问题1: Docker镜像拉取失败

**原因**: 网络连接问题或需要配置镜像源

**解决方案**:
1. 配置Docker镜像源（推荐使用国内镜像）
2. 或者使用VPN
3. 检查Docker Desktop是否正常运行

### 问题2: 端口被占用

**解决方案**:
```powershell
# 检查端口占用
Get-NetTCPConnection -LocalPort 5173
Get-NetTCPConnection -LocalPort 8080

# 停止占用端口的进程，或修改docker-compose.dev.yml中的端口映射
```

### 问题3: 数据库连接失败

**检查清单**:
1. MySQL服务是否运行
2. 数据库配置是否正确
3. 防火墙是否阻止连接
4. Zeabur MySQL的公网访问是否开启

## 📝 开发说明

### 代码热重载

- **前端**: 代码修改后自动重载（Vite HMR）
- **后端**: 代码修改后自动重启（Nodemon）

### 文件挂载

开发环境的代码通过volume挂载，修改本地文件会立即反映到容器中。

### 环境变量

开发环境的环境变量在 `docker-compose.dev.yml` 中配置。


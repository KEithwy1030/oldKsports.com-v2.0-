# OldKSports 开发环境启动脚本

Write-Host "🚀 启动 OldKSports 开发环境..." -ForegroundColor Green

# 检查Docker是否运行
Write-Host "`n📋 检查Docker状态..." -ForegroundColor Yellow
$dockerStatus = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker未运行，请先启动Docker Desktop" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker运行正常" -ForegroundColor Green

# 检查端口是否被占用
Write-Host "`n📋 检查端口占用..." -ForegroundColor Yellow
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
$port8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue

if ($port5173) {
    Write-Host "⚠️  端口 5173 已被占用" -ForegroundColor Yellow
}
if ($port8080) {
    Write-Host "⚠️  端口 8080 已被占用" -ForegroundColor Yellow
}

# 设置数据库连接（如果需要连接到Zeabur的MySQL）
Write-Host "`n📋 数据库配置..." -ForegroundColor Yellow
Write-Host "当前配置：" -ForegroundColor Cyan
Write-Host "  - MYSQL_HOST: 如果未设置，默认使用 host.docker.internal (本地MySQL)" -ForegroundColor Gray
Write-Host "  - 要连接到Zeabur MySQL，请设置环境变量或在docker-compose.dev.yml中修改" -ForegroundColor Gray

# 启动服务
Write-Host "`n🚀 构建并启动容器..." -ForegroundColor Green
docker-compose -f docker-compose.dev.yml up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 服务启动成功！" -ForegroundColor Green
    Write-Host "`n📝 访问地址：" -ForegroundColor Cyan
    Write-Host "  - 前端: http://localhost:5173" -ForegroundColor White
    Write-Host "  - 后端API: http://localhost:8080/api" -ForegroundColor White
    Write-Host "`n📊 查看日志：" -ForegroundColor Cyan
    Write-Host "  docker-compose -f docker-compose.dev.yml logs -f" -ForegroundColor Gray
    Write-Host "`n🛑 停止服务：" -ForegroundColor Cyan
    Write-Host "  docker-compose -f docker-compose.dev.yml down" -ForegroundColor Gray
} else {
    Write-Host "`n❌ 启动失败，请检查错误信息" -ForegroundColor Red
    Write-Host "提示：如果网络连接失败，可能需要配置Docker镜像源" -ForegroundColor Yellow
}


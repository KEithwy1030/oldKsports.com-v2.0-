# MySQL 数据导入脚本
# 用于导入 oldksports_v2_cleaned.sql 到 Zeabur MySQL 数据库

param(
    [string]$Host = "hkgl.clusters.zeabur.com",
    [int]$Port = 30960,
    [string]$Username = "root",
    [string]$Password = "069t3mpT5IJY87ces1GHqQ40S2Xnyg10",
    [string]$Database = "oldksports",
    [string]$SqlFile = "oldksports_v2_cleaned_for_import.sql"
)

Write-Host "`n=== MySQL 数据导入脚本 ===" -ForegroundColor Cyan
Write-Host "主机: $Host" -ForegroundColor White
Write-Host "端口: $Port" -ForegroundColor White
Write-Host "数据库: $Database" -ForegroundColor White
Write-Host "SQL 文件: $SqlFile" -ForegroundColor White
Write-Host "`n正在尝试连接..." -ForegroundColor Yellow

# 检查 SQL 文件是否存在
if (-not (Test-Path $SqlFile)) {
    Write-Host "✗ SQL 文件不存在: $SqlFile" -ForegroundColor Red
    exit 1
}

# 尝试使用 mysql 命令行工具
$mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
if ($mysqlPath) {
    Write-Host "✓ 找到 MySQL 客户端" -ForegroundColor Green
    Write-Host "`n正在导入数据..." -ForegroundColor Yellow
    
    $env:MYSQL_PWD = $Password
    $connectionString = "-h$Host -P$Port -u$Username --default-character-set=utf8mb4 $Database"
    
    Get-Content $SqlFile -Encoding UTF8 | & mysql.exe $connectionString
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ 数据导入成功！" -ForegroundColor Green
    } else {
        Write-Host "`n✗ 数据导入失败，错误代码: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✗ 未找到 MySQL 客户端" -ForegroundColor Red
    Write-Host "`n请安装 MySQL 客户端，或使用以下命令手动导入:" -ForegroundColor Yellow
    Write-Host "`nmysql -h $Host -P $Port -u $Username -p $Database < $SqlFile" -ForegroundColor Cyan
    Write-Host "`n密码: $Password" -ForegroundColor Gray
    exit 1
}

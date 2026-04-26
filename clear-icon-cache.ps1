# 清理Windows图标缓存并重启资源管理器
# 需要以管理员权限运行

Write-Host "=== Windows Icon Cache Cleaner ===" -ForegroundColor Cyan
Write-Host ""

# 1. 停止资源管理器
Write-Host "[1/4] Stopping Explorer..." -ForegroundColor Yellow
taskkill /f /im explorer.exe 2>$null | Out-Null
Start-Sleep -Seconds 2

# 2. 删除图标缓存
Write-Host "[2/4] Clearing icon cache..." -ForegroundColor Yellow
$cachePaths = @(
    "$env:LOCALAPPDATA\IconCache.db",
    "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache_*.db",
    "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache_*.db"
)

foreach ($path in $cachePaths) {
    Get-Item $path -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        Write-Host "  Deleted: $($_.Name)" -ForegroundColor Green
    }
}

# 3. 重建图标缓存数据库
Write-Host "[3/4] Rebuilding icon database..." -ForegroundColor Yellow
ie4uinit.exe -show 2>$null | Out-Null

# 4. 重启资源管理器
Write-Host "[4/4] Restarting Explorer..." -ForegroundColor Yellow
Start-Process explorer.exe

Write-Host ""
Write-Host "=== Done! Icon cache has been cleared ===" -ForegroundColor Green
Write-Host ""
Write-Host "Please restart your Tauri app to see the new icon." -ForegroundColor Cyan
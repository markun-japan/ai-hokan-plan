# パンドラ セットアップ
# 使い方: powershell ai-hokan-kit/scripts/setup_pandora.ps1

param([string]$PandoraPath = "$HOME\Desktop\パンドラ")

Write-Host "=== パンドラ セットアップ ===" -ForegroundColor Cyan

# フォルダ作成
if (-not (Test-Path $PandoraPath)) {
    New-Item -ItemType Directory -Path $PandoraPath -Force | Out-Null
}
@("main", "archive") | ForEach-Object {
    $sub = Join-Path $PandoraPath $_
    if (-not (Test-Path $sub)) { New-Item -ItemType Directory -Path $sub -Force | Out-Null }
}

# アーカイブスクリプト作成
$archiveScript = @'
$PandoraPath = "$HOME\Desktop\パンドラ"
$agentsDir = "$HOME\.openclaw\agents"
$Date = Get-Date -Format "yyyy-MM-dd"

if (Test-Path $agentsDir) {
    Get-ChildItem $agentsDir -Directory | ForEach-Object {
        $sessions = Join-Path $_.FullName "sessions"
        if (Test-Path $sessions) {
            $dest = Join-Path $PandoraPath $_.Name
            if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
            Get-ChildItem $sessions -Filter "*.jsonl" | ForEach-Object {
                Copy-Item $_.FullName (Join-Path $dest $_.Name) -Force
            }
            Write-Host "[$Date] Archived $($_.Name)"
        }
    }
}
Write-Host "[$Date] Pandora archive complete"
'@

$scriptPath = Join-Path $PandoraPath "archive_sessions.ps1"
$archiveScript | Set-Content $scriptPath -Encoding UTF8

# タスクスケジューラ登録
try {
    $action = New-ScheduledTaskAction -Execute "powershell" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
    $trigger = New-ScheduledTaskTrigger -Daily -At "03:00"
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    Register-ScheduledTask -TaskName "PandoraArchive" -Action $action -Trigger $trigger -Settings $settings -Description "パンドラ日次アーカイブ" -Force
    Write-Host "Task registered: PandoraArchive (daily 3:00 AM)" -ForegroundColor Green
} catch {
    Write-Host "WARNING: タスク登録失敗。手動でタスクスケジューラに登録してください" -ForegroundColor Yellow
}

Write-Host "`n=== 完了 ===" -ForegroundColor Cyan
Write-Host "保存先: $PandoraPath"
Write-Host "一文字も捨てない。" -ForegroundColor Yellow

# 批量修復所有剩餘的 ephemeral: true 問題
$commandsPath = "commands\slash"
$files = Get-ChildItem -Path $commandsPath -Name "*.js"

$totalFixed = 0

foreach ($fileName in $files) {
    $filePath = Join-Path $commandsPath $fileName
    $content = Get-Content -Path $filePath -Raw -Encoding UTF8
    $originalContent = $content
    
    # 替換所有的 ephemeral: true
    $content = $content -replace 'ephemeral:\s*true', 'flags: 1 << 6 // Discord.MessageFlags.Ephemeral'
    
    # 修復帶逗號的情況
    $content = $content -replace '(flags:\s*1\s*<<\s*6\s*//\s*Discord\.MessageFlags\.Ephemeral)\s*,', '$1,'
    
    if ($content -ne $originalContent) {
        Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "已修復: $fileName" -ForegroundColor Green
        $totalFixed++
    }
}

Write-Host "`n總共修復了 $totalFixed 個文件" -ForegroundColor Cyan

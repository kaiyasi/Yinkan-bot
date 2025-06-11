# 全面修復所有 ephemeral: true 問題的腳本
# 處理所有 slash 指令文件

$files = Get-ChildItem -Path "commands\slash\" -Filter "*.js" -File

foreach ($file in $files) {
    $filePath = $file.FullName
    $content = Get-Content -Path $filePath -Raw -Encoding UTF8
    $originalContent = $content
    
    if ($content -match 'ephemeral: true') {
        Write-Host "修復文件: $($file.Name)" -ForegroundColor Yellow
        
        # 替換所有的 ephemeral: true 為 flags: 1 << 6
        $content = $content -replace 'ephemeral:\s*true(?![\w])', 'flags: 1 << 6 // Discord.MessageFlags.Ephemeral'
        
        # 修復特殊情況：帶逗號的替換
        $content = $content -replace 'flags: 1 << 6 // Discord\.MessageFlags\.Ephemeral,', 'flags: 1 << 6, // Discord.MessageFlags.Ephemeral'
        
        # 修復 deferReply 中的 ephemeral
        $content = $content -replace 'deferReply\(\s*\{\s*flags: 1 << 6 // Discord\.MessageFlags\.Ephemeral\s*\}\s*\)', 'deferReply({ flags: 1 << 6 })'
        
        # 檢查是否有變化
        if ($content -ne $originalContent) {
            # 保存文件
            $content | Set-Content -Path $filePath -Encoding UTF8 -NoNewline
            Write-Host "完成: $($file.Name)" -ForegroundColor Green
        } else {
            Write-Host "無變化: $($file.Name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "跳過: $($file.Name) (無 ephemeral)" -ForegroundColor Gray
    }
}

Write-Host "`n檢查剩餘的 ephemeral 用法..." -ForegroundColor Cyan
$remainingFiles = @()

foreach ($file in $files) {
    $filePath = $file.FullName
    $content = Get-Content -Path $filePath -Raw -Encoding UTF8
    
    if ($content -match 'ephemeral:\s*true') {
        $remainingFiles += $file.Name
    }
}

if ($remainingFiles.Count -gt 0) {
    Write-Host "`n仍有 ephemeral 問題的文件:" -ForegroundColor Red
    foreach ($fileName in $remainingFiles) {
        Write-Host "  - $fileName" -ForegroundColor Red
    }
} else {
    Write-Host "`n所有文件修復完成！" -ForegroundColor Green
}

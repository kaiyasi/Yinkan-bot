const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { version } = require('../package.json');

console.log('🚀 開始打包專案...');

// 建立 scripts 目錄的上層路徑 (專案根目錄)
const projectRoot = path.join(__dirname, '..');

// 建立輸出檔案的資料流
const outputFileName = `Yinkan-bot-v${version}.zip`;
const output = fs.createWriteStream(path.join(projectRoot, outputFileName));
const archive = archiver('zip', {
  zlib: { level: 9 } // 設定壓縮等級
});

// 監聽封存完成事件
output.on('close', function() {
  console.log(`✅ 專案已成功打包成 ${outputFileName}`);
  console.log(`📦 總大小: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

// 監聽錯誤事件
archive.on('error', function(err) {
  throw err;
});

// 將輸出流對接到 archiver
archive.pipe(output);

// 要忽略的檔案和資料夾
const ignorePatterns = [
    'node_modules/**',
    '.git/**',
    '.env',
    '*.zip',
    'MODERNIZATION_REPORT.md',
    'COMPLETION_REPORT.md',
    'scripts/**', // 忽略 scripts 資料夾本身
    'index_new.js', // 忽略備份檔案
    'play_backup.js' // 忽略備份檔案
];

// 將所有檔案（除了被忽略的）加入到 ZIP 中
archive.glob('**/*', {
    cwd: projectRoot,
    ignore: ignorePatterns,
    dot: true // 包含 .gitignore 等點開頭的檔案
});

// 完成封存
archive.finalize();

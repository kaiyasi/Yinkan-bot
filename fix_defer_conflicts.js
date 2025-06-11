const fs = require('fs');
const path = require('path');

// 需要修復的文件列表
const filesToFix = [
    'replay.js', 'search.js', 'skipto.js', 'seek.js', 'remove.js', 
    'lyrics.js', 'help.js', 'clean.js', 'volume.js', 'summon.js',
    'stats.js', 'skip.js', 'shuffle.js', 'move.js', 'invite.js',
    'clear.js', 'dynamicvoice.js', 'filters.js', 'guildleave.js',
    'loop.js', 'loopq.js', 'nowplaying.js', 'pause.js', 'stop.js'
];

function fixDeferConflicts(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 移除手動 deferReply 調用
    const deferPatterns = [
        /\s*await interaction\.deferReply\(\);\s*/g,
        /\s*await interaction\.deferReply\(\{ ephemeral: true \}\);\s*/g,
        /\s*await interaction\.deferReply\(\{ ephemeral: false \}\);\s*/g,
        /\s*await interaction\.deferReply\(\)\.catch\(\(_\) => \{\}\);\s*/g
    ];
    
    deferPatterns.forEach(pattern => {
        content = content.replace(pattern, '\n');
    });
    
    // 將 editReply 改為 reply
    content = content.replace(/interaction\.editReply\(/g, 'interaction.reply(');
    content = content.replace(/await interaction\.editReply\(/g, 'await interaction.reply(');
    
    return content;
}

console.log('開始修復 defer 衝突...');

filesToFix.forEach(fileName => {
    const filePath = path.join(__dirname, 'commands', 'slash', fileName);
    
    if (fs.existsSync(filePath)) {
        try {
            const originalContent = fs.readFileSync(filePath, 'utf8');
            const fixedContent = fixDeferConflicts(filePath);
            
            if (originalContent !== fixedContent) {
                fs.writeFileSync(filePath, fixedContent, 'utf8');
                console.log(`✅ 已修復: ${fileName}`);
            } else {
                console.log(`⏩ 無需修復: ${fileName}`);
            }
        } catch (error) {
            console.error(`❌ 修復失敗 ${fileName}:`, error.message);
        }
    } else {
        console.warn(`⚠️  文件不存在: ${fileName}`);
    }
});

console.log('修復完成！');

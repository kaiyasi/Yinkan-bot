const fs = require('fs');
const path = require('path');

// 編碼修復映射 - 更準確的對應
const fixMap = {
    // 常見錯誤字符替換
    '者': '',
    '的': '',
    '�': '',
    // 完整詞彙替換
    '者��的�人': '機器人',
    '者��者語音者��的�': '在語音頻道',
    '者��的��者': '自動離開',
    '者�放的': '播放器',
    '者��者': '啟用',
    '者��者': '關閉',
    '者�用': '啟用',
    '者�在': '會在',
    '不�者': '不會',
    '自者�離者�': '自動離開',
    '一者�伺者�器': '未知伺服器',
    '者��的�在語音者��者中�的�使者�此者�令': '你必須在語音頻道中才能使用此指令',
    '者�在語音者��者': '不在語音頻道',
    '者�索並播者��者求�者歌曲': '搜索並播放你要求的歌曲',
    '者��的�索什麼�者': '你想要搜索什麼？',
    '設置 selfDefer 屬性�者表示此�者令�的��的��者延遲者��者': '設置 selfDefer 屬性，表示此指令會自行處理延遲回應',
    '者��者語音者��者': '檢查語音頻道',
    'Lavalink 節點未的��': 'Lavalink 節點未連接',
    '者��者中�的�正者�播者��的�容': '目前沒有正在播放的內容',
    '者�改者��者歌曲者�音者��者': '更改正在播放歌曲的音量',
    '你想要更者��的��者大�的��者如�者10': '你想要更改的音量大小（例如：10）',
    'Discord Player 者��者始�者': 'Discord Player 未初始化',
    '者��者沒�者�者��者�放者�音樂�者': '目前沒有正在播放音樂',
    '請求者': '請求者',
    '者.toString()': '.toString()',
    // 修復常見的句型
    '機器人�者': '機器人將',
    '語音者��的�': '語音頻道',
    '自者�離者�': '自動離開',
    '。': '。'
};

function fixText(text) {
    let fixed = text;
    
    // 先處理完整的詞彙
    for (const [wrong, correct] of Object.entries(fixMap)) {
        if (wrong.length > 1) { // 只處理較長的字符串
            fixed = fixed.replace(new RegExp(escapeRegex(wrong), 'g'), correct);
        }
    }
    
    // 再處理單個字符
    for (const [wrong, correct] of Object.entries(fixMap)) {
        if (wrong.length === 1) {
            fixed = fixed.replace(new RegExp(escapeRegex(wrong), 'g'), correct);
        }
    }
    
    // 清理多餘的空格和錯誤字符
    fixed = fixed.replace(/[者�的]+/g, '');
    fixed = fixed.replace(/\s+/g, ' ');
    fixed = fixed.trim();
    
    return fixed;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 手動修復特定文件的特定內容
const manualFixes = {
    'autoleave.js': {
        '.setDescription("者��的�人者��者語音者��的�自者�離者��的��者�者)': '.setDescription("設置機器人在語音頻道空閒時自動離開")',
        'Discord Player 者��者始�者': 'Discord Player 未初始化',
        '者��者沒�者�者��者�放者�音樂�者': '目前沒有正在播放音樂'
    },
    'play.js': {
        '.setDescription("者�索並播者��者求�者歌曲")': '.setDescription("搜索並播放你要求的歌曲")',
        '.setDescription("者��的�索什麼�者")': '.setDescription("你想要搜索什麼？")',
        '"者��的�在語音者��者中�的�使者�此者�令"': '"你必須在語音頻道中才能使用此指令"',
        '"者�在語音者��者"': '"不在語音頻道"'
    },
    'volume.js': {
        '.setDescription("者�改者��者歌曲者�音者��者)': '.setDescription("更改正在播放歌曲的音量")',
        '"你想要更者��的��者大�的��者如�者10"': '"你想要更改的音量大小（例如：10）"'
    }
};

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        const fileName = path.basename(filePath);
        
        // 應用手動修復
        if (manualFixes[fileName]) {
            for (const [wrong, correct] of Object.entries(manualFixes[fileName])) {
                content = content.replace(new RegExp(escapeRegex(wrong), 'g'), correct);
            }
        }
        
        // 應用通用修復
        content = fixText(content);
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`修復編碼: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`處理文件錯誤 ${filePath}:`, error.message);
        return false;
    }
}

// 處理 commands/slash 目錄
const slashDir = path.join(__dirname, 'commands', 'slash');
const files = fs.readdirSync(slashDir).filter(file => file.endsWith('.js'));

console.log('開始修復 slash 指令的編碼問題...');
let fixedCount = 0;

for (const file of files) {
    const filePath = path.join(slashDir, file);
    if (processFile(filePath)) {
        fixedCount++;
    }
}

console.log(`完成！修復了 ${fixedCount} 個文件的編碼問題。`);

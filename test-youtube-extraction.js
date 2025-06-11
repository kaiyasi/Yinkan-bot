// 測試 YouTube URL 處理和音訊提取
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');

// 創建測試客戶端
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const player = new Player(client);

async function testYouTubeExtraction() {
    try {
        console.log('🔧 設置 YouTubei 提取器...');
        
        // 設置 YouTubei 提取器，使用更寬鬆的配置
        await player.extractors.register(YoutubeiExtractor, {
            streamOptions: {
                quality: 'medium', // 使用中等品質
                format: 'any',     // 接受任何格式
                type: 'audio',     // 只需要音頻
            }
        });
        
        console.log('✅ YouTubei 提取器設置完成');
        console.log('📋 已載入的提取器:', player.extractors.store.map(ext => ext.identifier || 'unknown').join(', '));
        
        // 測試不同的搜索策略
        const testQueries = [
            '風箏 2012 2022',
            'popular music 2022',
            'Chinese music',
            'music'
        ];
        
        for (const query of testQueries) {
            try {
                console.log(`\n🔍 測試搜索: "${query}"`);
                
                const searchResult = await player.search(query, {
                    requestedBy: { id: 'test-user', username: 'Test User' },
                    searchEngine: undefined // 讓系統自動選擇
                });
                
                if (searchResult && searchResult.tracks && searchResult.tracks.length > 0) {
                    console.log(`✅ 搜索成功！找到 ${searchResult.tracks.length} 首歌曲`);
                    console.log(`   第一首: ${searchResult.tracks[0].title}`);
                    console.log(`   來源: ${searchResult.tracks[0].source}`);
                    break; // 找到結果就停止測試
                } else {
                    console.log(`❌ 搜索失敗: 沒有找到結果`);
                }
                
            } catch (searchError) {
                console.log(`❌ 搜索錯誤: ${searchError.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

// 當機器人準備就緒時執行測試
client.once('ready', async () => {
    console.log(`✅ 測試機器人已登入: ${client.user.tag}`);
    
    // 等待一下讓所有初始化完成
    setTimeout(async () => {
        await testYouTubeExtraction();
        
        // 測試完成後斷開連接
        setTimeout(() => {
            console.log('🔚 測試完成，關閉連接');
            client.destroy();
            process.exit(0);
        }, 5000);
    }, 2000);
});

// 錯誤處理
client.on('error', (error) => {
    console.error('客戶端錯誤:', error);
});

process.on('unhandledRejection', (error) => {
    if (error.message && error.message.includes('No matching formats found')) {
        console.log('⚠️ 檢測到 YouTube 格式錯誤（預期的）');
        return;
    }
    console.error('未處理的 Promise 拒絕:', error);
});

// 登入機器人
console.log('🚀 啟動測試...');
client.login(process.env.TOKEN).catch(error => {
    console.error('登入失敗:', error);
    process.exit(1);
});

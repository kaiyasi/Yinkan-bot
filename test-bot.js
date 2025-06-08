const { Client, GatewayIntentBits } = require('discord.js');

// 簡單的測試腳本來檢查基本功能
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ]
});

client.once('ready', () => {
    console.log('✅ Discord 客戶端啟動成功！');
    console.log(`🤖 機器人已登入為: ${client.user.tag}`);
    process.exit(0);
});

client.on('error', (error) => {
    console.error('❌ Discord 客戶端錯誤:', error);
    process.exit(1);
});

// 測試配置文件
try {
    const config = require('./config.js');
    console.log('✅ 配置文件載入成功');
    
    // 測試機器人令牌
    if (!config.TOKEN) {
        console.error('❌ 機器人令牌未設置');
        process.exit(1);
    }
    
    console.log('🔐 正在嘗試登入...');
    client.login(config.TOKEN);
    
} catch (error) {
    console.error('❌ 載入配置文件失敗:', error.message);
    process.exit(1);
}

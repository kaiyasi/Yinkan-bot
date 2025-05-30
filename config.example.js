/**
 * Discord 音樂機器人配置文件範例
 * 複製此文件為 config.js 並填入您的實際值
 */

module.exports = {
    // Discord 機器人基本配置
    client: {
        token: process.env.DISCORD_TOKEN || "您的機器人令牌",
        id: process.env.CLIENT_ID || "您的機器人ID"
    },

    // 機器人設定
    opt: {
        DJ: {
            enabled: false,  // 啟用DJ模式（僅DJ角色可控制音樂）
            roleName: "DJ",  // DJ角色名稱
            commands: ["back", "clear", "filter", "loop", "pause", "resume", "skip", "stop", "volume"] // DJ專用指令
        },
        
        // 音樂播放設定
        maxVol: 100,        // 最大音量
        loopMessage: false, // 是否顯示循環訊息
        
        // Discord.js 設定
        discordPlayer: {
            ytdlOptions: {
                quality: "highestaudio",
                highWaterMark: 1 << 25,
                filter: "audioonly"
            }
        }
    },

    // Emoji 設定
    emoji: {
        play: "⏯️",
        stop: "⏹️",
        queue: "📄",
        success: "☑️",
        repeat: "🔁",
        error: "❌"
    },

    // 生產環境專用設定
    production: {
        // 啟用生產模式優化
        enableOptimizations: true,
        
        // 錯誤報告（可選）
        errorReporting: false,
        
        // 統計收集（可選）
        collectStats: false
    }
};

// 環境變數說明：
// DISCORD_TOKEN - Discord 機器人令牌
// CLIENT_ID - Discord 應用程式 ID
// NODE_ENV - 運行環境 (development/production) 
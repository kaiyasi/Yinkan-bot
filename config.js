require('dotenv').config();

module.exports = {
    // Discord 機器人基本配置
    token: process.env.TOKEN,
    clientId: process.env.CLIENT_ID,
    adminId: process.env.ADMIN_ID,

    // 邀請連結設定
    permissions: "8", // 預設為管理員權限，您可以自訂
    inviteScopes: ["bot", "applications.commands"],

    // 顏色設定
    embedColor: "#0099ff", // 預設嵌入訊息顏色

    // 幫助指令設定
    helpCmdPerPage: 8,

    // 圖示 URL
    iconURL: "https://cdn.discordapp.com/avatars/750613142488481843/e6326038dbe2243ca551ba5b6ecd8bf2.png?size=1024",

    // 支援連結
    supportServer: "https://discord.gg/your-support-server", // 請替換成您的支援伺服器連結
    Issues: "https://github.com/your-repo/issues", // 請替換成您的問題回報連結

    // discord-player 設定
    player: {
        ytdlOptions: {
            quality: "highestaudio",
            highWaterMark: 1 << 25,
            filter: "audioonly",
            dlChunkSize: 0,
        },
        // 使用 YouTube Cookie
        useYouTubeCookie: !!process.env.YT_COOKIE,
        youtubeCookie: process.env.YT_COOKIE || undefined,
    },

    // DJ 模式設定
    DJ: {
        enabled: false,  // 是否啟用DJ模式 (啟用後只有DJ角色能使用特定指令)
        roleName: "DJ",  // 您的DJ角色名稱
        commands: [      // 僅限DJ使用的指令
            "back",
            "clear",
            "filter",
            "loop",
            "pause",
            "resume",
            "skip",
            "stop",
            "volume",
            "shuffle"
        ]
    }
};
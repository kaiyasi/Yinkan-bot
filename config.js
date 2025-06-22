module.exports = {
    helpCmdPerPage: 10, //- /help指令每頁指令數
    lyricsMaxResults: 5, //- 不要碰
    adminId: process.env.ADMIN_ID || "", // 移到環境變數
    token: process.env.TOKEN || "", // 移到環境變數
    clientId: process.env.CLIENT_ID || "", // 移到環境變數
    clientSecret: process.env.CLIENT_SECRET || "", // 移到環境變數
    port: 4200, //- API和網頁控制台的port，依需求更改，否則保留不變
    scopes: ["identify", "guilds", "applications.commands"], //- 不要碰
    inviteScopes: ["bot", "applications.commands"], // 這也不要碰
    serverDeafen: true, //- 機器人是否設為拒聽
    defaultVolume: 50, // 調整為較合理的音量
    supportServer: "https://discord.gg/sbySMS7m3v", //- 支援伺服器，預設為官方的就行
    Issues: "https://github.com/SudhanPlayz/Discord-MusicBot/issues", //- 機器人的錯誤回報
    permissions: 277083450689, //- 機器人權限，不用改
    disconnectTime: 300000, // 調整為 5 分鐘
    twentyFourSeven: false, //- 設定為true，則機器人會永遠待在語音頻道，直到你手動將其斷線
    autoQueue: false, //- 設為true，則機器人會在你指定的音樂撥放完畢後自動加入相關的歌曲(類似自動撥放)
    autoPause: true, //- 設為true，當所有人離開語音頻道後，機器人會自動暫停撥放音樂
    autoLeave: true, // 改為 true 以節省資源
    debug: false, //- 除錯模式，只有在你知道你在幹嘛的時候才能開啟這個選項
    cookieSecret: process.env.COOKIE_SECRET || "change_this_to_something_secure",
    website: process.env.WEBSITE_URL || "http://localhost:4200", //- 如果是在電腦上執行則不需要更改，如果是在雲端主機上執行則依需求更改
    embedColor: "#2f3136", //- Discord embed顏色 支援hex color
    // 狀態顯示 
    presence: {
        // PresenceData object | https://discord.js.org/#/docs/main/stable/typedef/PresenceData
        status: "online", //- 選項:online, idle, dnd invisible (注意: invisible 會讓其他人以為機器人未開啟)
        activities: [
            {
                name: "🎵 音樂 | /help",
                type: "LISTENING", //- 選項:PLAYING, WATCHING, LISTENING, STREAMING
            },
        ],
    },
    iconURL: "https://cdn.darrennathanael.com/icons/spinning_disk.gif", //- 每個embed中會顯示的圖標
};
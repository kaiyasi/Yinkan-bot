const { ActivityType } = require('discord.js');
const colors = require('colors');
const { loadDynamicVoiceSettings } = require('../commands/slash/dynamicvoice.js');

/**
 *
 * @param {import("../lib/DiscordMusicBot")} client
 */
module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(colors.green(`[機器人] ${client.user.tag} 已成功登入`));

        // 載入動態語音頻道設定 (Load dynamic voice channel settings)
        // This line was already present, but the subsequent block was a duplicate and misplaced.
        loadDynamicVoiceSettings(client);

        // 設定機器人狀態 (Set bot status)
        client.user.setActivity({
            name: '音樂 | /help',
            type: ActivityType.Listening
        });

        // 安全地初始化音樂管理器 (Safely initialize music manager)
        try {
            if (client.manager && typeof client.manager.init === 'function') {
                client.manager.init(client.user.id);
                console.log(colors.green('[音樂管理器] 已初始化'));
            } else {
                console.warn(colors.yellow('[音樂管理器] 無法初始化：manager 物件不存在或無 init 方法'));

                // 如果使用 discord-player 而不是 erela.js (If using discord-player instead of erela.js)
                if (client.player) {
                    console.log(colors.green('[音樂播放器] 已存在，檢查提取器狀態...'));

                    // 檢查並顯示提取器狀態 (Check and display extractor status)
                    const extractors = client.player.extractors.store.map(ext => ext.identifier || 'unknown');
                    console.log(colors.cyan('[提取器] 目前已載入的提取器:'), extractors.join(', '));

                    if (extractors.length === 0) {
                        console.warn(colors.yellow('[提取器] 警告：沒有提取器被載入！嘗試重新載入...'));
                        try {
                            await client.setupExtractors();
                        } catch (error) {
                            console.error(colors.red('[提取器] 重新載入失敗:'), error);
                        }
                    } else {
                        console.log(colors.green(`[提取器] ✅ 已載入 ${extractors.length} 個提取器`));
                    }
                }
            }
        } catch (error) {
            console.error(colors.red('[音樂管理器] 初始化失敗:'), error);
        }

        // 載入動態語音頻道設定 (Load dynamic voice channel settings) - Refactored and consolidated
        try {
            // 導入動態語音頻道模組 (Import dynamic voice channel module)
            const dynamicVoiceModule = require('../commands/slash/dynamicvoice');

            // 如果有提供載入函數，使用它載入設定 (If a load function is provided, use it to load settings)
            if (typeof dynamicVoiceModule.loadDynamicVoiceSettings === 'function') {
                dynamicVoiceModule.loadDynamicVoiceSettings(client);
                console.log(colors.green('[動態語音] 設定已載入'));
            }
            // 若無載入函數但有設置事件監聽器函數，則確保事件監聽已設置
            // (If no load function but there's a setup event listener function, ensure the event listener is set up)
            else if (typeof dynamicVoiceModule.setupEventListener === 'function') {
                // 確保 dynamicVoice Map 存在 (Ensure dynamicVoice Map exists)
                if (!client.dynamicVoice) {
                    client.dynamicVoice = new Map();

                    // 載入設定 (直接在這裡實現載入邏輯) (Load settings - implement load logic directly here)
                    const fs = require('fs');
                    const path = require('path');
                    const dataPath = path.join(__dirname, '../data/dynamicVoice.json');

                    if (fs.existsSync(dataPath)) {
                        try {
                            const savedData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                            for (const [guildId, settings] of Object.entries(savedData)) {
                                client.dynamicVoice.set(guildId, settings);
                            }
                            console.log(colors.green(`[動態語音] 已載入 ${client.dynamicVoice.size} 個伺服器設定`));
                        } catch (err) {
                            console.error(colors.red('[動態語音] 載入設定時出錯:'), err);
                        }
                    }
                }

                // 設置事件監聽器 (Set up event listener)
                dynamicVoiceModule.setupEventListener(client);
                console.log(colors.green('[動態語音] 事件監聽器已設置'));
            }
        } catch (error) {
            console.error(colors.red('[動態語音] 載入失敗:'), error);
        }
    }
};
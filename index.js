require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { Player } = require('discord-player');
const path = require('path');

// 處理未捕捉的 Promise 拒絕
process.on('unhandledRejection', (error) => {
    console.error('未處理的 Promise 拒絕:', error);
    
    // 如果是 play-dl 的 Invalid URL 錯誤，記錄但不終止程序
    if (error.code === 'ERR_INVALID_URL' && error.input === 'undefined') {
        console.log('⚠️ 檢測到 play-dl URL 錯誤，這通常是暫時性的串流問題');
        return;
    }
});

// 處理未捕捉的例外
process.on('uncaughtException', (error) => {
    console.error('未捕捉的例外:', error);
});

class MusicBot extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        this.commands = new Collection();
        this.cooldowns = new Collection();
        this.config = require('./config.js');

        // 設定 FFmpeg 路徑
        const ffmpeg = require('ffmpeg-static');
        process.env.FFMPEG_PATH = ffmpeg;
        console.log('🔧 設定 FFmpeg 路徑:', ffmpeg);

        // 強制使用 @discordjs/opus 而不是 opusscript
        process.env.OPUS_ENGINE = '@discordjs/opus';
        console.log('🔧 強制使用 @discordjs/opus 編碼器');

        // 初始化 Discord Player 並配置選項
        this.player = new Player(this, {
            skipFFmpeg: false, // 重新啟用 FFmpeg 進行音訊處理
            lagMonitor: 5000,
            connectionTimeout: 30000,
            useLegacyFFmpeg: false,
            ytdlOptions: {
                quality: 'highestaudio', // 改回高品質音訊
                filter: 'audioonly',
                highWaterMark: 1 << 25,
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }
            },
            // 修改音訊配置
            audioPlayerOptions: {
                seek: 0,
                volume: 1.0, // 使用 1.0 而不是百分比
                bufferingTimeout: 5000,
                connectionTimeout: 30000
            }
        });
        
        this.setupPlayerEvents();
    }

    // 重新設計 Embed 方法
    Embed(text, title = null) {
        let embed = new EmbedBuilder()
            .setColor(this.config.embedColor || '#2f3136')
            .setTimestamp()
            .setFooter({ 
                text: `${this.user.username} Music Bot`, 
                iconURL: this.user.displayAvatarURL() 
            });
        
        if (title) {
            embed.setTitle(title);
        }
        
        if (text) {
            embed.setDescription(text);
        }
        
        return embed;
    }

    // 重新設計 ErrorEmbed 方法
    ErrorEmbed(text, title = "錯誤") {
        let embed = new EmbedBuilder()
            .setColor('#ff4757')
            .setTitle(`❌ ${title}`)
            .setDescription(text)
            .setTimestamp()
            .setFooter({ 
                text: `${this.user.username} Music Bot`, 
                iconURL: this.user.displayAvatarURL() 
            });
        
        return embed;
    }

    // 添加成功 Embed 方法
    SuccessEmbed(text, title = "成功") {
        let embed = new EmbedBuilder()
            .setColor('#2ed573')
            .setTitle(`✅ ${title}`)
            .setDescription(text)
            .setTimestamp()
            .setFooter({ 
                text: `${this.user.username} Music Bot`, 
                iconURL: this.user.displayAvatarURL() 
            });
        
        return embed;
    }

    // 添加警告 Embed 方法
    WarningEmbed(text, title = "警告") {
        let embed = new EmbedBuilder()
            .setColor('#ffa502')
            .setTitle(`⚠️ ${title}`)
            .setDescription(text)
            .setTimestamp()
            .setFooter({ 
                text: `${this.user.username} Music Bot`, 
                iconURL: this.user.displayAvatarURL() 
            });
        
        return embed;
    }

    // 添加音樂 Embed 方法
    MusicEmbed(title, description = null) {
        let embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle(`🎵 ${title}`)
            .setTimestamp()
            .setFooter({ 
                text: `${this.user.username} Music Bot`, 
                iconURL: this.user.displayAvatarURL() 
            });
        
        if (description) {
            embed.setDescription(description);
        }
        
        return embed;
    }

    // 創建簡化的播放控制面板
    createPlayerController(guildId, queue) {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_previous')
                    .setLabel('上一首')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!queue || !queue.history?.tracks?.length),
                
                new ButtonBuilder()
                    .setCustomId('music_playpause')
                    .setLabel(queue?.node?.isPaused() ? '播放' : '暫停')
                    .setEmoji(queue?.node?.isPaused() ? '▶️' : '⏸️')
                    .setStyle(queue?.node?.isPaused() ? ButtonStyle.Success : ButtonStyle.Primary)
                    .setDisabled(!queue || !queue.currentTrack),
                
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('下一首')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!queue || !queue.tracks?.data?.length),
                
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('停止')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!queue || !queue.currentTrack),
                
                new ButtonBuilder()
                    .setCustomId('music_nowplaying')
                    .setLabel('播放進度')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!queue || !queue.currentTrack)
            );
    }

    // 移除次要控制面板方法
    createSecondaryController(guildId, queue) {
        // 不再需要次要控制面板
        return null;
    }

    // 添加控制面板更新方法
    async updatePlayerController(message, queue) {
        try {
            const updatedController = this.createPlayerController(queue.guild.id, queue);
            await message.edit({
                embeds: message.embeds,
                components: [updatedController]
            });
        } catch (error) {
            console.error('更新控制面板失敗:', error);
        }
    }

    async setupExtractors() {
        // 直接載入所有預設提取器
        console.log('⚙️ 載入預設音樂提取器...');
        this.player.extractors.loadDefault();
        
        // 顯示已載入的 extractors
        const extractors = this.player.extractors.store.map(ext => ext.identifier || 'unknown');
        console.log('📋 已載入的提取器:', extractors.join(', '));
        
        if (extractors.length === 0) {
            console.error('❌ 沒有提取器被載入！音樂功能可能無法使用。');
        } else {
            console.log(`✅ 成功載入 ${extractors.length} 個提取器`);
        }
    }

    setupPlayerEvents() {
        // Player 事件
        this.player.events.on('playerStart', async (queue, track) => {
            console.log(`🎵 開始播放: ${track.title}`);
            
            if (queue?.metadata?.channel?.send) {
                // 創建現在播放的embed
                const nowPlayingEmbed = this.MusicEmbed("正在播放")
                    .setDescription(`**[${track.title}](${track.url})**`)
                    .addFields([
                        { 
                            name: '👤 請求者', 
                            value: track.requestedBy?.toString() || '未知', 
                            inline: true 
                        },
                        { 
                            name: '⏱️ 時長', 
                            value: track.duration || '直播', 
                            inline: true 
                        },
                        { 
                            name: '👥 頻道', 
                            value: queue.connection?.channel?.name || '未知', 
                            inline: true 
                        }
                    ]);

                if (track.thumbnail) {
                    nowPlayingEmbed.setThumbnail(track.thumbnail);
                }

                // 發送持久控制面板
                try {
                    const controllerMessage = await queue.metadata.channel.send({
                        embeds: [nowPlayingEmbed],
                        components: [
                            this.createPlayerController(queue.guild.id, queue)
                        ]
                    });
                    
                    // 儲存控制面板訊息以供後續更新
                    queue.metadata.controllerMessage = controllerMessage;
                } catch (error) {
                    console.error('發送控制面板錯誤:', error);
                }
            }
        });

        this.player.events.on('audioTrackAdd', (queue, track) => {
            console.log(`➕ 添加到佇列: ${track.title}`);
            
            if (queue?.metadata?.channel?.send) {
                const addedEmbed = this.SuccessEmbed(
                    `**[${track.title}](${track.url})**\n👤 請求者: ${track.requestedBy?.toString()}`, 
                    "已添加到佇列"
                );
                
                if (track.thumbnail) {
                    addedEmbed.setThumbnail(track.thumbnail);
                }
                
                // 使用臨時訊息，5秒後自動刪除
                queue.metadata.channel.send({ embeds: [addedEmbed] })
                    .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000))
                    .catch(console.error);
            }
        });

        this.player.events.on('disconnect', (queue) => {
            console.log('❌ 已從語音頻道斷開連接');
            if (queue?.metadata?.channel?.send) {
                const disconnectEmbed = this.ErrorEmbed("已從語音頻道斷開連接", "連接中斷");
                queue.metadata.channel.send({ embeds: [disconnectEmbed] }).catch(console.error);
            }
        });

        this.player.events.on('emptyChannel', (queue) => {
            console.log('📭 語音頻道為空，自動離開');
            if (queue?.metadata?.channel?.send) {
                const emptyEmbed = this.WarningEmbed("語音頻道為空，機器人將自動離開", "頻道空置");
                queue.metadata.channel.send({ embeds: [emptyEmbed] }).catch(console.error);
            }
        });

        this.player.events.on('emptyQueue', (queue) => {
            console.log('📭 播放佇列已空');
            if (queue?.metadata?.channel?.send) {
                const endEmbed = this.MusicEmbed("播放結束", "所有歌曲已播放完畢")
                    .setColor('#ffa502');
                queue.metadata.channel.send({ embeds: [endEmbed] }).catch(console.error);
            }
        });

        this.player.events.on('error', (queue, error) => {
            console.error(`播放錯誤:`, error);
            if (queue?.metadata?.channel?.send) {
                const errorEmbed = this.ErrorEmbed(`發生播放錯誤: ${error.message}`, "播放錯誤");
                queue.metadata.channel.send({ embeds: [errorEmbed] }).catch(console.error);
            }
        });

        // 添加更多事件處理
        this.player.events.on('playerError', (queue, error) => {
            console.error(`播放器錯誤:`, error);
            if (queue?.metadata?.channel?.send) {
                const errorEmbed = this.ErrorEmbed(`播放器發生錯誤: ${error.message}`, "播放器錯誤");
                queue.metadata.channel.send({ embeds: [errorEmbed] }).catch(console.error);
            }
        });

        this.player.events.on('playerSkip', (queue, track) => {
            console.log(`⏭️ 跳過歌曲: ${track.title}`);
            if (queue?.metadata?.channel?.send) {
                const skipEmbed = this.WarningEmbed(`已跳過: **${track.title}**`, "跳過歌曲");
                queue.metadata.channel.send({ embeds: [skipEmbed] })
                    .then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000))
                    .catch(console.error);
            }
        });

        this.player.events.on('playerFinish', (queue, track) => {
            console.log(`✅ 播放完成: ${track.title}`);
        });

        // 添加音訊資源錯誤事件
        this.player.events.on('audioTrackError', (queue, track, error) => {
            console.error(`音訊軌道錯誤 [${track.title}]:`, error);
            if (queue?.metadata?.channel?.send) {
                const errorEmbed = this.ErrorEmbed(
                    `無法播放 **${track.title}**: ${error.message}`, 
                    "音訊錯誤"
                );
                queue.metadata.channel.send({ embeds: [errorEmbed] }).catch(console.error);
            }
        });

        // 添加連接錯誤事件
        this.player.events.on('connectionError', (queue, error) => {
            console.error(`連接錯誤:`, error);
            if (queue?.metadata?.channel?.send) {
                const errorEmbed = this.ErrorEmbed(`連接發生錯誤: ${error.message}`, "連接錯誤");
                queue.metadata.channel.send({ embeds: [errorEmbed] }).catch(console.error);
            }
        });

        // 添加調試事件
        this.player.events.on('debug', (queue, message) => {
            console.log(`[DEBUG] ${message}`);
        });
    }

    // 載入指令
    loadCommands() {
        const fs = require('fs');
        
        // 載入斜線指令
        const slashCommandsPath = path.join(__dirname, 'commands', 'slash');
        if (fs.existsSync(slashCommandsPath)) {
            const commandFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const filePath = path.join(slashCommandsPath, file);
                    const command = require(filePath);
                    // 檢查 SlashCommand 物件或標準指令物件
                    if (command && command.data && (command.run || command.execute)) {
                        this.commands.set(command.data.name, command);
                        console.log(`✅ 已載入斜線指令：${command.data.name}`);
                    }
                } catch (error) {
                    console.error(`❌ 載入指令 ${file} 時發生錯誤:`, error);
                }
            }
        }

        // 載入一般指令
        const commandsPath = path.join(__dirname, 'commands');
        if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
                try {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
                    if (command && command.data && command.execute) {
                this.commands.set(command.data.name, command);
                console.log(`✅ 已載入指令：${command.data.name}`);
                    }
                } catch (error) {
                    console.error(`❌ 載入指令 ${file} 時發生錯誤:`, error);
                }
            }
        }
    }

    // 載入事件
    loadEvents() {
        const fs = require('fs');
        const eventsPath = path.join(__dirname, 'events');
        
        if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
                try {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            
            if (event.once) {
                this.once(event.name, (...args) => event.execute(...args, this));
            } else {
                this.on(event.name, (...args) => event.execute(...args, this));
            }
            console.log(`✅ 已載入事件：${event.name}`);
                } catch (error) {
                    console.error(`❌ 載入事件 ${file} 時發生錯誤:`, error);
                }
            }
        }
    }

    // 初始化機器人
    async init() {
        try {
            // 檢查必要的環境變數
            if (!this.config.token) {
                throw new Error('未設定 Discord Bot Token！請在 config.js 中設定 token。');
            }

        // 載入指令和事件
        this.loadCommands();
        this.loadEvents();

            // 設置音樂提取器
            await this.setupExtractors();

        // 設置錯誤處理
        this.on('error', error => {
            console.error('機器人錯誤：', error);
        });

        this.on('warn', warning => {
            console.warn('機器人警告：', warning);
        });

        process.on('unhandledRejection', error => {
            console.error('未處理的 Promise 拒絕：', error);
        });

        // 登入機器人
        await this.login(this.config.token);
            console.log(`✅ 機器人已成功登入！`);

        } catch (error) {
            console.error('初始化機器人時發生錯誤：', error);
            process.exit(1);
        }
    }
}

// 創建機器人實例
const client = new MusicBot();

// 初始化並啟動機器人
client.init().catch(error => {
    console.error('啟動機器人時發生錯誤：', error);
    process.exit(1);
});

console.log("Make sure to fill in the config.js before starting the bot.");

module.exports = {
    getClient: () => client,
};

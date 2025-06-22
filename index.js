require("dotenv").config();
const { Client, Collection, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Player } = require("discord-player");
const fs = require("fs");
const path = require("path");

class MusicBot extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
            ],
            partials: [Partials.Channel, Partials.Message],
            shards: "auto",
        });

        this.slashCommands = new Collection();
        this.contextCommands = new Collection();
        this.cooldowns = new Collection();
        this.config = require("./config.js");

        // Initialize discord-player
        this.player = new Player(this, {
            ytdlOptions: this.config.player.ytdlOptions,
        });
        
        // Load default extractors
        this.player.extractors.loadDefault();
        
        // Setup error handling
        this.on("error", console.error);
        this.on("warn", console.warn);
        
        // Setup player events
        this.setupPlayerEvents();
    }

    // Error Embed
    ErrorEmbed(text, title = "錯誤") {
        return new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle(`❌ ${title}`)
            .setDescription(text)
            .setTimestamp();
    }

    // Success Embed
    SuccessEmbed(text, title = "成功") {
        return new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle(`✅ ${title}`)
            .setDescription(text)
            .setTimestamp();
    }

    // Music Embed
    MusicEmbed(title, description = "") {
        return new EmbedBuilder()
            .setColor(this.config.embedColor)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    // Warning Embed
    WarningEmbed(text, title = "警告") {
        return new EmbedBuilder()
            .setColor("#FFA500")
            .setTitle(`⚠️ ${title}`)
            .setDescription(text)
            .setTimestamp();
    }

    // Create the player control panel
    createPlayerController(guildId, queue) {
        const isPaused = queue?.node?.isPaused();
        const repeatMode = queue?.repeatMode ?? 0;

        let loopStyle = ButtonStyle.Secondary;
        let loopEmoji = '➡️';
        let loopLabel = '循環';

        if (repeatMode === 1) { // RepeatMode.Track
            loopStyle = ButtonStyle.Success;
            loopEmoji = '🔂';
            loopLabel = '單曲循環';
        } else if (repeatMode === 2) { // RepeatMode.Queue
            loopStyle = ButtonStyle.Success;
            loopEmoji = '🔁';
            loopLabel = '佇列循環';
        }

        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_previous')
                    .setLabel('上一首')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!queue || !queue.history?.tracks?.data?.length),
                
                new ButtonBuilder()
                    .setCustomId('music_playpause')
                    .setLabel(isPaused ? '播放' : '暫停')
                    .setEmoji(isPaused ? '▶️' : '⏸️')
                    .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary)
                    .setDisabled(!queue || !queue.currentTrack),
                
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('下一首')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!queue || !queue.tracks?.data?.length),
                
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel(loopLabel)
                    .setEmoji(loopEmoji)
                    .setStyle(loopStyle)
                    .setDisabled(!queue || !queue.currentTrack),

                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('停止')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!queue || !queue.currentTrack)
            );
    }

    // Update the player control panel
    async updatePlayerController(message, queue) {
        try {
            if (!message || !message.edit) return;
            const updatedController = this.createPlayerController(queue.guild.id, queue);
            await message.edit({
                embeds: message.embeds,
                components: [updatedController]
            });
        } catch (error) {
            console.error('Failed to update controller:', error);
        }
    }

    // Setup all player event listeners
    setupPlayerEvents() {
        // When a track starts playing
        this.player.events.on('playerStart', async (queue, track) => {
            console.log(`🎵 Start playing: ${track.title}`);
            
            if (queue?.metadata?.channel?.send) {
                const nowPlayingEmbed = this.MusicEmbed("正在播放")
                    .setDescription(`**[${track.title}](${track.url})**`)
                    .addFields([
                        { name: '👤 請求者', value: track.requestedBy?.toString() || '未知', inline: true },
                        { name: '⏱️ 時長', value: track.duration || '直播', inline: true },
                        { name: '🎤 作者', value: track.author || '未知', inline: true }
                    ])
                    .setThumbnail(track.thumbnail || this.user.displayAvatarURL());

                try {
                    const controllerMessage = await queue.metadata.channel.send({
                        embeds: [nowPlayingEmbed],
                        components: [this.createPlayerController(queue.guild.id, queue)]
                    });
                    
                    // Store the controller message in metadata to update it later
                    queue.metadata.controllerMessage = controllerMessage;
                } catch (error) {
                    console.error('Error sending controller panel:', error);
                }
            }
        });

        // When a single track is added to the queue
        this.player.events.on('audioTrackAdd', (queue, track) => {
            console.log(`➕ Added to queue: ${track.title}`);
            
            if (queue?.metadata?.channel?.send) {
                const addedEmbed = this.SuccessEmbed(
                    `**[${track.title}](${track.url})**\n👤 請求者: ${track.requestedBy?.toString()}`, 
                    "已添加到佇列"
                ).setThumbnail(track.thumbnail);
                
                queue.metadata.channel.send({ embeds: [addedEmbed] })
                    .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000))
                    .catch(console.error);
            }
        });

        // When multiple tracks (a playlist) are added to the queue
        this.player.events.on('audioTracksAdd', (queue, tracks) => {
            console.log(`➕ Added playlist with ${tracks.length} songs.`);

            if (queue?.metadata?.channel?.send) {
                 const playlistEmbed = this.SuccessEmbed(
                    `已成功添加 **${tracks.length}** 首歌曲到播放佇列\n👤 請求者: ${tracks[0]?.requestedBy?.toString() || '未知'}`, 
                    "播放清單已添加"
                );

                if (tracks.length > 0) {
                     const shortenTitle = (title, maxLength = 50) => {
                        return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
                    };
                    
                    const trackList = tracks.slice(0, 3).map((track, index) => 
                        `${index + 1}. **${shortenTitle(track.title)}** (${track.duration || '直播'})`
                    ).join('\n');
                    
                    const fieldValue = trackList + (tracks.length > 3 ? `\n...以及其他 ${tracks.length - 3} 首歌曲` : '');

                    if (fieldValue.length <= 1024) {
                        playlistEmbed.addFields([{ name: '🎵 歌曲預覽', value: fieldValue, inline: false }]);
                    } else {
                        playlistEmbed.addFields([{ name: '🎵 播放清單統計', value: `共 ${tracks.length} 首歌曲已添加到佇列\n使用 \`/queue\` 指令查看完整清單`, inline: false }]);
                    }
                    
                    if (tracks[0].thumbnail) {
                        playlistEmbed.setThumbnail(tracks[0].thumbnail);
                    }
                }
                
                queue.metadata.channel.send({ embeds: [playlistEmbed] }).catch(console.error);
            }
        });

        // When the queue is empty
        this.player.events.on('emptyQueue', (queue) => {
            console.log('📭 Queue is empty.');
            if (queue?.metadata?.channel?.send) {
                const endEmbed = this.MusicEmbed("播放結束", "所有歌曲已播放完畢").setColor('#ffa502');
                queue.metadata.channel.send({ embeds: [endEmbed] }).catch(console.error);
            }
        });

        // When the bot is disconnected from the voice channel
        this.player.events.on('disconnect', (queue) => {
            console.log('❌ Disconnected from voice channel.');
            if (queue?.metadata?.channel?.send) {
                const disconnectEmbed = this.ErrorEmbed("已從語音頻道斷開連接", "連接中斷");
                queue.metadata.channel.send({ embeds: [disconnectEmbed] }).catch(console.error);
            }
        });

        // When the voice channel is empty
        this.player.events.on('emptyChannel', (queue) => {
            console.log('🚶 Channel is empty, auto-leaving.');
            if (queue?.metadata?.channel?.send) {
                const emptyEmbed = this.WarningEmbed("語音頻道為空，機器人將自動離開", "頻道空置");
                queue.metadata.channel.send({ embeds: [emptyEmbed] }).catch(console.error);
            }
        });

        // Generic player error
        this.player.events.on('error', (queue, error) => {
            console.error(`Player Error:`, error);
            if (queue?.metadata?.channel?.send) {
                const errorEmbed = this.ErrorEmbed(`發生播放錯誤: ${error.message}`, "播放錯誤");
                queue.metadata.channel.send({ embeds: [errorEmbed] }).catch(console.error);
            }
        });

        // Error with an audio resource
        this.player.events.on('playerError', (queue, error) => {
            console.error(`Player runtime error:`, error);
            if (queue?.metadata?.channel?.send) {
                const errorEmbed = this.ErrorEmbed(`播放器發生錯誤: ${error.message}`, "播放器錯誤");
                queue.metadata.channel.send({ embeds: [errorEmbed] }).catch(console.error);
            }
        });
    }
}

// --- Bot Initialization ---

// Create the bot instance
const client = new MusicBot();

// Load Slash Commands
const slashCommandsPath = path.join(__dirname, "commands/slash");
if (fs.existsSync(slashCommandsPath)) {
    const slashCommandFiles = fs.readdirSync(slashCommandsPath).filter((file) => file.endsWith(".js"));

    for (const file of slashCommandFiles) {
        const filePath = path.join(slashCommandsPath, file);
        try {
            const command = require(filePath);
            if (command.name && command.run) {
                client.slashCommands.set(command.name, command);
                console.log(`✅ Loaded slash command: ${command.name}`);
            } else {
                console.log(`❌ Error loading ${file}: command is missing "name" or "run" property.`);
            }
        } catch (error) {
            console.error(`❌ Error loading slash command ${file}: ${error.message}`);
        }
    }
} else {
    console.warn("`commands/slash` directory not found. Skipping slash command loading.");
}


// Load Events
const eventsPath = path.join(__dirname, "events");
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const event = require(filePath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`✅ Loaded event: ${event.name}`);
        } catch (error) {
            console.error(`❌ Error loading event ${file}: ${error.message}`);
        }
    }
} else {
    console.warn("`events` directory not found. Skipping event loading.");
}


// Unhandled Rejection
process.on('unhandledRejection', error => {
    console.error('Unhandled Promise Rejection:', error);
});


// Login to Discord
try {
    console.log("Logging in...");
    if (!client.config.token) {
        throw new Error("Bot token is missing! Please check your config.js file.");
    }
    client.login(client.config.token);
} catch(error) {
    console.error("Failed to login:", error);
}


// Export client for other modules if needed
module.exports = client;

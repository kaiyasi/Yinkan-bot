const { EmbedBuilder } = require('discord.js');
const lyricsFinder = require('lyrics-finder');
const Controller = require("../util/Controller");
const yt = require("youtube-sr").default;

// 動態導入 pretty-ms
let prettyMs;
(async () => {
    prettyMs = (await import('pretty-ms')).default;
})();

/**
 *
 * @param {import("../lib/DiscordMusicBot")} client
 * @param {import("discord.js").Interaction}interaction
 */
module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            // 處理斜線指令
            if (interaction.isCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) {
                    return await interaction.reply({ 
                        embeds: [client.ErrorEmbed("找不到此指令", "指令錯誤")],
                        ephemeral: true 
                    });
                }

                try {
                    await command.execute(interaction, client);
                } catch (error) {
                    console.error(error);
                    const errorEmbed = client.ErrorEmbed("執行指令時發生錯誤", "執行錯誤");
                    
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            embeds: [errorEmbed],
                            ephemeral: true 
                        });
                    } else {
                        await interaction.editReply({ 
                            embeds: [errorEmbed],
                            ephemeral: true 
                        });
                    }
                }
            }

            // 處理語音頻道控制面板
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('voice_control_')) {
                    await handleVoiceChannelControl(interaction, client);
                    return;
                }
            }

            // 處理按鈕互動
            if (interaction.isButton()) {
                // 處理語音頻道快捷按鈕
                if (interaction.customId.startsWith('voice_quick_')) {
                    await handleVoiceChannelQuickAction(interaction, client);
                    return;
                }
                
                const queue = client.player.nodes.get(interaction.guildId);
                
                // 檢查是否為音樂控制按鈕
                if (interaction.customId.startsWith('music_')) {
                    const member = interaction.member;
                    
                    if (!member.voice.channel) {
                        return await interaction.reply({ 
                            embeds: [client.ErrorEmbed("請先加入語音頻道", "語音頻道錯誤")],
                            ephemeral: true 
                        });
                    }

                    if (!queue) {
                        return await interaction.reply({ 
                            embeds: [client.ErrorEmbed("目前沒有正在播放的音樂", "播放狀態錯誤")],
                            ephemeral: true 
                        });
                    }

                    try {
                        await interaction.deferReply({ ephemeral: true });

                        switch (interaction.customId) {
                            case 'music_playpause':
                                const wasPaused = queue.node.isPaused();
                                queue.node.setPaused(!wasPaused);
                                
                                const pauseEmbed = client.SuccessEmbed(
                                    wasPaused ? "音樂已恢復播放" : "音樂已暫停",
                                    wasPaused ? "恢復播放" : "暫停播放"
                                );
                                await interaction.editReply({ embeds: [pauseEmbed] });
                                
                                // 更新原始控制面板的按鈕狀態
                                try {
                                    if (queue.metadata.controllerMessage) {
                                        await client.updatePlayerController(queue.metadata.controllerMessage, queue);
                                    }
                                } catch (error) {
                                    console.error('更新控制面板錯誤:', error);
                                }
                                break;

                            case 'music_skip':
                                if (!queue.tracks?.data?.length) {
                                    return interaction.editReply({ 
                                        embeds: [client.ErrorEmbed("佇列中沒有下一首歌曲", "跳過失敗")] 
                                    });
                                }
                                queue.node.skip();
                                const skipEmbed = client.SuccessEmbed("已跳過當前歌曲", "跳過歌曲");
                                await interaction.editReply({ embeds: [skipEmbed] });
                                break;

                            case 'music_stop':
                                queue.delete();
                                const stopEmbed = client.SuccessEmbed("已停止播放並清空佇列", "停止播放");
                                await interaction.editReply({ embeds: [stopEmbed] });
                                break;

                            case 'music_previous':
                                if (!queue.history?.tracks?.length) {
                                    return interaction.editReply({ 
                                        embeds: [client.ErrorEmbed("沒有上一首歌曲", "回到上一首失敗")] 
                                    });
                                }
                                await queue.history.back();
                                const prevEmbed = client.SuccessEmbed("已返回上一首歌曲", "上一首");
                                await interaction.editReply({ embeds: [prevEmbed] });
                                break;

                            case 'music_nowplaying':
                                // 獲取當前播放信息
                                const track = queue.currentTrack;
                                
                                // 檢查是否有當前播放的歌曲
                                if (!track) {
                                    return interaction.editReply({
                                        embeds: [client.ErrorEmbed("目前沒有正在播放的音樂", "播放狀態")]
                                    });
                                }
                                
                                // 創建播放進度條
                                function createProgressBar(current, total, length = 20) {
                                    if (!current || !total || total === 0) return "▬".repeat(length);
                                    
                                    const progress = current / total;
                                    const filledLength = Math.round(length * progress);
                                    const filled = "▰".repeat(filledLength);
                                    const empty = "▱".repeat(length - filledLength);
                                    
                                    return filled + empty;
                                }

                                // 獲取播放時間信息
                                const timestamp = queue.node.getTimestamp();
                                const current = timestamp ? timestamp.current.value : 0;
                                const total = track.durationMS || 0;
                                
                                let currentTime = "0:00";
                                let totalTime = track.duration || "未知";
                                let progressBar = "▬".repeat(20);
                                
                                if (prettyMs && current && total) {
                                    try {
                                        currentTime = prettyMs(current, { colonNotation: true, secondsDecimalDigits: 0 });
                                        totalTime = prettyMs(total, { colonNotation: true, secondsDecimalDigits: 0 });
                                        progressBar = createProgressBar(current, total);
                                    } catch (error) {
                                        console.error("格式化時間錯誤:", error);
                                    }
                                }
                                
                                const nowPlayingEmbed = client.MusicEmbed("正在播放")
                                    .setDescription(`**[${track.title}](${track.url})**`)
                                    .addFields([
                                        { name: '👤 請求者', value: track.requestedBy?.toString() || '未知', inline: true },
                                        { name: '🎤 作者', value: track.author || '未知', inline: true },
                                        { name: '⏱️ 時長', value: totalTime, inline: true },
                                        { 
                                            name: '📊 播放進度', 
                                            value: `\`${currentTime}\` ${progressBar} \`${totalTime}\``, 
                                            inline: false 
                                        }
                                    ]);

                                if (track.thumbnail) {
                                    nowPlayingEmbed.setThumbnail(track.thumbnail);
                                }

                                if (queue.node.isPaused()) {
                                    nowPlayingEmbed.setFooter({ text: "⏸️ 已暫停" });
                                } else {
                                    nowPlayingEmbed.setFooter({ text: "▶️ 播放中" });
                                }

                                await interaction.editReply({ embeds: [nowPlayingEmbed] });
                                break;

                            default:
                                await interaction.editReply({
                                    embeds: [client.ErrorEmbed("無效的按鈕操作", "按鈕錯誤")]
                                });
                        }
                    } catch (error) {
                        console.error('按鈕互動錯誤：', error);
                        
                        // 檢查互動是否已經被延遲回應
                        if (interaction.deferred) {
                            try {
                                await interaction.editReply({
                                    embeds: [client.ErrorEmbed("處理按鈕操作時發生錯誤", "操作錯誤")]
                                });
                            } catch (replyError) {
                                console.error('編輯按鈕互動回應時發生錯誤:', replyError);
                            }
                        } else if (!interaction.replied) {
                            try {
                                await interaction.reply({
                                    embeds: [client.ErrorEmbed("處理按鈕操作時發生錯誤", "操作錯誤")],
                                    ephemeral: true
                                });
                            } catch (replyError) {
                                console.error('回應按鈕互動時發生錯誤:', replyError);
                            }
                        }
                    }
                }
            }

            if (interaction.isAutocomplete()) {
                const url = interaction.options.getString("query")
                if (url === "") return;

                const match = [
                    /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
                    /^(?:spotify:|https:\/\/[a-z]+\.spotify\.com\/(track\/|user\/(.*)\/playlist\/|playlist\/))(.*)$/,
                    /^https?:\/\/(?:www\.)?deezer\.com\/[a-z]+\/(track|album|playlist)\/(\d+)$/,
                    /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(soundcloud\.com|snd\.sc)\/(.*)$/,
                    /(?:https:\/\/music\.apple\.com\/)(?:.+)?(artist|album|music-video|playlist)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)/
                ].some(function (match) {
                    return match.test(url) == true;
                });

                async function checkRegex() {
                    if (match == true) {
                        let choice = []
                        choice.push({ name: url, value: url })
                        await interaction.respond(choice).catch(() => { });
                    }
                }

                const Random = "ytsearch"[Math.floor(Math.random() * "ytsearch".length)];

                if (interaction.commandName == "play") {
                    checkRegex()
                    let choice = []
                    await yt.search(url || Random, { safeSearch: false, limit: 25 }).then(result => {
                        result.forEach(x => { choice.push({ name: x.title, value: x.url }) })
                    });
                    return await interaction.respond(choice).catch(() => { });
                } else if (result.loadType === "LOAD_FAILED" || "NO_MATCHES")
                    return;
            }
        } catch (error) {
            console.error('互動處理錯誤：', error);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        embeds: [client.ErrorEmbed("處理互動時發生錯誤", "系統錯誤")],
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('回應互動時發生錯誤:', replyError);
                }
            }
        }
    }
};

/**
 * 處理語音頻道控制面板選單
 * @param {Interaction} interaction 
 * @param {Client} client 
 */
async function handleVoiceChannelControl(interaction, client) {
    const ownerId = interaction.customId.split('_')[2];
    const selectedValue = interaction.values[0];
    
    // 檢查權限
    if (interaction.user.id !== ownerId) {
        return interaction.reply({
            embeds: [client.ErrorEmbed("只有頻道擁有者可以使用此控制面板", "權限不足")],
            ephemeral: true
        });
    }
    
    const channel = interaction.member.voice.channel;
    if (!channel) {
        return interaction.reply({
            embeds: [client.ErrorEmbed("您必須在語音頻道中才能使用此功能", "未在語音頻道")],
            ephemeral: true
        });
    }
    
    try {
        switch (selectedValue) {
            case 'rename_channel':
                await interaction.reply({
                    embeds: [client.MusicEmbed("修改頻道名稱", "請回覆您想要的新頻道名稱：")],
                    ephemeral: true
                });
                
                // 創建訊息收集器
                const filter = m => m.author.id === interaction.user.id;
                const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
                
                collector.on('collect', async (msg) => {
                    const newName = msg.content.trim();
                    if (newName.length > 100) {
                        return msg.reply({
                            embeds: [client.ErrorEmbed("頻道名稱不能超過100個字符", "名稱過長")],
                            ephemeral: true
                        });
                    }
                    
                    await channel.setName(newName);
                    msg.reply({
                        embeds: [client.SuccessEmbed(`頻道名稱已更改為：**${newName}**`, "🏷️ 名稱已更新")]
                    });
                    msg.delete().catch(() => {});
                });
                break;
                
            case 'lock_channel':
                await channel.permissionOverwrites.edit(interaction.guild.id, {
                    Connect: false
                });
                await interaction.reply({
                    embeds: [client.SuccessEmbed("頻道已鎖定，只有被邀請的用戶可以加入", "🔒 頻道已鎖定")],
                    ephemeral: true
                });
                break;
                
            case 'unlock_channel':
                await channel.permissionOverwrites.edit(interaction.guild.id, {
                    Connect: true
                });
                await interaction.reply({
                    embeds: [client.SuccessEmbed("頻道已解鎖，所有人都可以加入", "🔓 頻道已解鎖")],
                    ephemeral: true
                });
                break;
                
            case 'block_user':
                await interaction.reply({
                    embeds: [client.MusicEmbed("封鎖用戶", "請提及(@)您要封鎖的用戶：")],
                    ephemeral: true
                });
                break;
                
            case 'invite_user':
                await interaction.reply({
                    embeds: [client.MusicEmbed("邀請用戶", `頻道邀請連結：https://discord.com/channels/${interaction.guild.id}/${channel.id}`)],
                    ephemeral: true
                });
                break;
                
            default:
                await interaction.reply({
                    embeds: [client.WarningEmbed("此功能正在開發中", "開發中")],
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error('處理語音頻道控制時發生錯誤:', error);
        await interaction.reply({
            embeds: [client.ErrorEmbed("處理請求時發生錯誤", "操作失敗")],
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * 處理語音頻道快捷按鈕
 * @param {Interaction} interaction 
 * @param {Client} client 
 */
async function handleVoiceChannelQuickAction(interaction, client) {
    const [, , action, ownerId] = interaction.customId.split('_');
    
    // 檢查權限
    if (interaction.user.id !== ownerId) {
        return interaction.reply({
            embeds: [client.ErrorEmbed("只有頻道擁有者可以使用此按鈕", "權限不足")],
            ephemeral: true
        });
    }
    
    const channel = interaction.member.voice.channel;
    if (!channel) {
        return interaction.reply({
            embeds: [client.ErrorEmbed("您必須在語音頻道中才能使用此功能", "未在語音頻道")],
            ephemeral: true
        });
    }
    
    try {
        switch (action) {
            case 'lock':
                await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
                await interaction.reply({
                    embeds: [client.SuccessEmbed("頻道已快速鎖定", "🔒 鎖定成功")],
                    ephemeral: true
                });
                break;
                
            case 'unlock':
                await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
                await interaction.reply({
                    embeds: [client.SuccessEmbed("頻道已快速解鎖", "🔓 解鎖成功")],
                    ephemeral: true
                });
                break;
                
            case 'rename':
                await interaction.reply({
                    embeds: [client.MusicEmbed("快速重新命名", "請回覆您想要的新頻道名稱：")],
                    ephemeral: true
                });
                break;
                
            case 'settings':
                const settingsEmbed = client.MusicEmbed("頻道設定")
                    .addFields([
                        { name: '📝 頻道名稱', value: channel.name, inline: true },
                        { name: '👥 成員數量', value: `${channel.members.size} 人`, inline: true },
                        { name: '🔒 狀態', value: channel.permissionsFor(interaction.guild.id)?.has('Connect') ? '🔓 開放' : '🔒 鎖定', inline: true },
                        { name: '👑 擁有者', value: `<@${ownerId}>`, inline: true },
                        { name: '🕐 創建時間', value: `<t:${Math.floor(channel.createdAt.getTime() / 1000)}:R>`, inline: true }
                    ]);
                    
                await interaction.reply({
                    embeds: [settingsEmbed],
                    ephemeral: true
                });
                break;
        }
    } catch (error) {
        console.error('處理快捷按鈕時發生錯誤:', error);
        await interaction.reply({
            embeds: [client.ErrorEmbed("處理請求時發生錯誤", "操作失敗")],
            ephemeral: true
        }).catch(() => {});
    }
}

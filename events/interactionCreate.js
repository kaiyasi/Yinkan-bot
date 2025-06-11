const { EmbedBuilder } = require('discord.js');
const lyricsFinder = require('lyrics-finder');
const Controller = require("../util/Controller");
const yt = require("youtube-sr").default;

// 動態導入 pretty-ms
let prettyMs;
(async () => {
    prettyMs = (await import('pretty-ms')).default;
})();

// 添加重試機制的輔助函數
async function retryOperation(operation, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            return await operation();
        } catch (error) {
            retries++;
            
            // 如果是自動完成相關操作，使用更短的等待時間
            const isAutocomplete = error.message?.includes('autocomplete') || 
                                operation.toString().includes('autocomplete');
            
            const waitTime = isAutocomplete ? 100 : 500; // 自動完成等待時間更短
            
            if (retries >= maxRetries) throw error;
            await new Promise(r => setTimeout(r, waitTime));
        }
    }
}

// 安全的回應函數
async function safeReply(interaction, payload, ephemeral = true) {
    try {
        if (!interaction) return;
        
        // 將 ephemeral 轉換為標準 flags 格式
        if (ephemeral) {
            if (!payload.flags) {
                payload.flags = 1 << 6; // 等同於 Discord.MessageFlags.Ephemeral (64)
            }
        }
        
        // 移除 ephemeral 屬性，使用 flags 代替
        const { ephemeral: _, ...cleanPayload } = payload;
        
        if (interaction.deferred) {
            return await interaction.editReply(cleanPayload);
        }
        
        if (interaction.replied) {
            return await interaction.followUp(cleanPayload);
        }
        
        return await interaction.reply(cleanPayload);
    } catch (error) {
        console.error('回應互動時發生錯誤:', error);
        // 如果是未知互動錯誤，我們就忽略它
        if (error.code === 10062) return;
        throw error;
    }
}

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
                    return await safeReply(interaction, { 
                        embeds: [client.ErrorEmbed("找不到此指令", "指令錯誤")]
                    });
                }

                try {
                    // 檢查互動是否已過期（Discord 互動有 15 分鐘限制）
                    const interactionAge = Date.now() - interaction.createdTimestamp;
                    if (interactionAge > 14 * 60 * 1000) { // 14分鐘作為安全邊界
                        console.log(`互動已接近過期時間，跳過指令執行: ${interaction.commandName}`);
                        return;
                    }
                    
                    // 立即使用 deferReply 避免超時問題
                    // 除非命令明確提到不需要延遲回應 (noDefer=true)
                    // 或命令會自行處理回應 (selfDefer=true)
                    if (!command.noDefer && !command.selfDefer) {
                        try {
                            await interaction.deferReply({
                                ephemeral: command.ephemeral || false
                            });
                            console.log(`📝 已延遲回應: ${interaction.commandName}`);
                        } catch (deferError) {
                            if (deferError.code !== 10062) { // 10062 為互動已過期錯誤碼
                                console.error('延遲回應失敗:', deferError);
                            }
                            return; // 如果延遲回應失敗，直接返回
                        }
                    }
                    
                    // 設置命令執行超時
                    const COMMAND_TIMEOUT = 12 * 60 * 1000; // 12分鐘超時限制
                    
                    // 執行命令，帶有超時控制
                    await Promise.race([
                        command.execute(interaction, client),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('指令執行超時')), COMMAND_TIMEOUT)
                        )
                    ]);
                } catch (error) {
                    console.error('執行指令時發生錯誤:', error);
                    
                    // 處理錯誤回應，更安全地處理互動狀態
                    try {
                        // 檢查是否為超時錯誤
                        if (error.message === '指令執行超時') {
                            console.log(`指令 ${interaction.commandName} 執行超時`);
                            return; // 超時情況下不嘗試回應，避免進一步錯誤
                        }
                        
                        const errorEmbed = client.ErrorEmbed(
                            error.message || "執行指令時發生錯誤", 
                            "執行錯誤"
                        );
                        
                        if (error.code === 10062 || error.code === 'InteractionAlreadyReplied') {
                            // 互動已過期或已回應，記錄但不執行任何操作
                            console.log('互動已過期或已回應，無法再次回應');
                            return;
                        }
                        
                        // 檢查互動年齡
                        const interactionAge = Date.now() - interaction.createdTimestamp;
                        if (interactionAge > 14 * 60 * 1000) {
                            console.log('互動接近過期，跳過錯誤回應');
                            return;
                        }
                        
                        if (interaction.deferred) {
                            await interaction.editReply({ embeds: [errorEmbed] });
                        } else if (!interaction.replied) {
                            await interaction.reply({ embeds: [errorEmbed], flags: 1 << 6 });
                        }
                    } catch (followUpError) {
                        console.error('回應錯誤失敗:', followUpError);
                        // 如果是互動相關錯誤，忽略
                        if (followUpError.code === 10062 || followUpError.code === 'InteractionAlreadyReplied') {
                            console.log('無法回應錯誤：互動已過期或已回應');
                        }
                    }
                }
            }
            
            // 處理語音頻道控制面板
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('voice_control_')) {
                    await retryOperation(async () => {
                        await handleVoiceChannelControl(interaction, client);
                    });
                    return;
                }
            }

            // 處理按鈕互動
            if (interaction.isButton()) {
                // 處理語音頻道快捷按鈕
                if (interaction.customId.startsWith('voice_quick_')) {
                    await retryOperation(async () => {
                        await handleVoiceChannelQuickAction(interaction, client);
                    });
                    return;
                }
                
                const queue = client.player.nodes.get(interaction.guildId);
                
                // 檢查是否為音樂控制按鈕
                if (interaction.customId.startsWith('music_')) {
                    const member = interaction.member;
                    
                    if (!member.voice.channel) {
                        return await safeReply(interaction, { 
                            embeds: [client.ErrorEmbed("請先加入語音頻道", "語音頻道錯誤")]
                        });
                    }

                    if (!queue) {
                        return await safeReply(interaction, { 
                            embeds: [client.ErrorEmbed("目前沒有正在播放的音樂", "播放狀態錯誤")]
                        });
                    }

                    try {
                        await interaction.deferReply({ ephemeral: true });

                        await retryOperation(async () => {
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
                        });
                    } catch (error) {
                        console.error('按鈕互動錯誤：', error);
                        await safeReply(interaction, {
                            embeds: [client.ErrorEmbed("處理按鈕操作時發生錯誤", "操作錯誤")]
                        });
                    }
                }
            }

            if (interaction.isAutocomplete()) {
                await handleAutocomplete(interaction);
                return;
            }
        } catch (error) {
            console.error('互動處理錯誤：', error);
            if (!interaction.replied && !interaction.deferred) {
                await safeReply(interaction, {
                    embeds: [client.ErrorEmbed("處理互動時發生錯誤", "系統錯誤")]
                }).catch(() => {});
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

// 添加自動完成處理增強功能

// 添加超時處理的輔助函數
async function withTimeout(promise, timeoutMs = 1500) {
  return new Promise((resolve) => {
    let timeoutHandle;
    
    // 設定超時
    timeoutHandle = setTimeout(() => {
      console.log(`⚠️ 操作超時 (${timeoutMs}ms)`);
      resolve([{ name: '搜尋中...', value: 'searching' }]);
    }, timeoutMs);
    
    // 執行實際操作
    promise
      .then((result) => {
        clearTimeout(timeoutHandle);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutHandle);
        console.error('操作失敗:', error);
        resolve([{ name: '搜尋失敗', value: 'error' }]);
      });
  });
}

// 處理自動完成互動
async function handleAutocomplete(interaction) {
  try {
    // 檢查互動是否已經回應過
    if (interaction.responded) return;
    
    const command = interaction.client.commands.get(interaction.commandName);
    
    // 如果命令不存在或沒有自動完成處理
    if (!command || !command.autocomplete) {
      return await interaction.respond([]);
    }
    
    // 使用超時保護執行自動完成 (縮短超時時間)
    const results = await withTimeout(
      command.autocomplete(interaction),
      1000  // 1 秒超時，確保在 Discord 的 3 秒限制之前回應
    );
    
    // 確保 results 是有效的自動完成選項數組
    const validResults = Array.isArray(results) ? results : [];
    
    // 限制回應大小，避免超出 Discord 限制
    const limitedResults = validResults.slice(0, 25);
    
    // 發送回應（如果尚未回應）
    if (!interaction.responded) {
      await interaction.respond(limitedResults);
    }
  } catch (error) {
    // 對於 10062 錯誤 (Unknown interaction)，只記錄但不再重試
    if (error.code === 10062) {
      console.log(`⚠️ 自動完成處理: 互動已過期，無法回應 (代碼 ${error.code})`);
      return;
    } else {
      console.error(`自動完成處理錯誤:`, error);
      
      // 嘗試給出簡單回應避免錯誤
      if (!interaction.responded) {
        try {
          await interaction.respond([]);
        } catch (respondError) {
          // 忽略二次回應錯誤
          if (respondError.code !== 10062) {
            console.error('回應失敗:', respondError);
          }
        }
      }
    }
  }
}

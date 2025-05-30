const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");
let pms;
(async () => {
    pms = (await import('pretty-ms')).default;
})();

const command = new SlashCommand()
.setName("queue")
.setDescription("顯示目前播放隊列")
.setRun(async (client, interaction) => {
    const queue = client.player.nodes.get(interaction.guild);
    
    if (!queue || !queue.currentTrack) {
        return interaction.reply({
            embeds: [client.ErrorEmbed("目前沒有正在播放的音樂", "播放狀態")],
            ephemeral: true
        });
    }

    const currentTrack = queue.currentTrack;
    const tracks = queue.tracks.data || [];
    
    if (tracks.length === 0) {
        const emptyQueueEmbed = client.MusicEmbed("播放佇列")
            .setDescription(`**🎵 正在播放：**\n[${currentTrack.title}](${currentTrack.url})\n\n**📜 佇列狀態：**\n佇列中沒有其他歌曲`)
            .addFields([
                {
                    name: "👤 請求者",
                    value: currentTrack.requestedBy?.toString() || "未知",
                    inline: true
                },
                {
                    name: "⏱️ 時長", 
                    value: currentTrack.duration || "直播",
                    inline: true
                },
                {
                    name: "🔁 循環模式",
                    value: queue.repeatMode === 0 ? "關閉" : queue.repeatMode === 1 ? "單曲循環" : "佇列循環",
                    inline: true
                }
            ]);
        
        if (currentTrack.thumbnail) {
            emptyQueueEmbed.setThumbnail(currentTrack.thumbnail);
        }
        
        return interaction.reply({ 
            embeds: [emptyQueueEmbed], 
            ephemeral: true 
        });
    }

    // 計算總時長
    let totalDuration = 0;
    tracks.forEach(track => {
        if (track.durationMS) {
            totalDuration += track.durationMS;
        }
    });

    const queueEmbed = client.MusicEmbed("播放佇列")
        .addFields([
            {
                name: "🎵 正在播放",
                value: `[${currentTrack.title}](${currentTrack.url})\n👤 ${currentTrack.requestedBy?.toString() || "未知"}`,
                inline: false
            }
        ]);

    // 顯示前 10 首歌曲
    const displayTracks = tracks.slice(0, 10);
    const queueList = displayTracks.map((track, i) => 
        `\`${i + 1}.\` [${track.title}](${track.url})\n👤 ${track.requestedBy?.toString() || "未知"}`
    ).join('\n\n');
    
    queueEmbed.addFields([
        {
            name: "📜 即將播放",
            value: queueList || "無",
            inline: false
        }
    ]);

    if (tracks.length > 10) {
        queueEmbed.addFields([
            {
                name: "➕ 更多歌曲",
                value: `還有 ${tracks.length - 10} 首歌曲在佇列中`,
                inline: false
            }
        ]);
    }

    // 添加統計信息
    let totalTimeText = "未知";
    if (totalDuration > 0 && pms) {
        try {
            totalTimeText = pms(totalDuration, { colonNotation: true });
        } catch (error) {
            console.error("格式化時間錯誤:", error);
        }
    }

    queueEmbed.addFields([
        {
            name: "📊 佇列統計",
            value: `🎵 **歌曲總數：** ${tracks.length + 1}\n⏱️ **預估時間：** ${totalTimeText}\n🔁 **循環模式：** ${queue.repeatMode === 0 ? "關閉" : queue.repeatMode === 1 ? "單曲循環" : "佇列循環"}`,
            inline: false
        }
    ]);

    if (currentTrack.thumbnail) {
        queueEmbed.setThumbnail(currentTrack.thumbnail);
    }

    return interaction.reply({ 
        embeds: [queueEmbed], 
        ephemeral: true 
    });
});

module.exports = command;

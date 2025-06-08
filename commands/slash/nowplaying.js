const { EmbedBuilder, escapeMarkdown } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

let prettyMs;
(async () => {
    prettyMs = (await import('pretty-ms')).default;
})();

const command = new SlashCommand()
    .setName("nowplaying")
    .setDescription("顯示目前正在播放的歌曲")
    .setSelfDefer(true)
    .setRun(async (client, interaction) => {
        await interaction.deferReply();
        
        const queue = client.player.nodes.get(interaction.guild);
        
        if (!queue || !queue.currentTrack) {
            return interaction.editReply({
                embeds: [client.ErrorEmbed("目前沒有正在播放音樂", "播放")],
                ephemeral: true
            });
        }

        const track = queue.currentTrack;

        // 建立播放進度條
        function createProgressBar(current, total, length = 20) {
            if (!current || !total || total === 0) return "▬".repeat(length);
            const progress = current / total;
            const filledLength = Math.round(length * progress);
            const filled = "▬".repeat(filledLength);
            const empty = "▬".repeat(length - filledLength);
            return filled + "🔘" + empty;
        }

        // 取得播放時間資訊
        const timestamp = queue.node.getTimestamp();
        const current = timestamp ? timestamp.current.value : 0;
        const total = track.durationMS || 0;

        let currentTime = "0:00";
        let totalTime = track.duration || "未知";
        let progressBar = "▬".repeat(20);

        if (prettyMs && current && total) {
            try {
                currentTime = prettyMs(current, { 
                    colonNotation: true, 
                    secondsDecimalDigits: 0 
                });
                totalTime = prettyMs(total, { 
                    colonNotation: true, 
                    secondsDecimalDigits: 0 
                });
                progressBar = createProgressBar(current, total);
            } catch (error) {
                console.error("時間格式化錯誤:", error);
            }
        }

        const nowPlayingEmbed = client.MusicEmbed("🎵 正在播放")
            .setDescription(`**[${escapeMarkdown(track.title)}](${track.url})**`)
            .addFields([
                {
                    name: "👤 請求者",
                    value: track.requestedBy.toString() || "未知",
                    inline: true
                },
                {
                    name: "🎤 作者",
                    value: track.author || "未知",
                    inline: true
                },
                {
                    name: "⏱️ 長度",
                    value: totalTime,
                    inline: true
                },
                {
                    name: "📊 播放進度",
                    value: `\`${currentTime}\` ${progressBar} \`${totalTime}\``,
                    inline: false
                },
                {
                    name: "🔊 音量",
                    value: `${queue.node.volume}%`,
                    inline: true
                },
                {
                    name: "🔄 循環模式",
                    value: queue.repeatMode === 0 
                        ? "關閉" 
                        : queue.repeatMode === 1 
                        ? "單曲循環" 
                        : "佇列循環",
                    inline: true
                },
                {
                    name: "🎤 語音頻道",
                    value: queue.connection.channel.name || "未知",
                    inline: true
                }
            ]);

        if (track.thumbnail) {
            nowPlayingEmbed.setThumbnail(track.thumbnail);
        }

        // 添加播放狀態
        if (queue.node.isPaused()) {
            nowPlayingEmbed.setFooter({ text: "⏸️ 已暫停播放" });
            nowPlayingEmbed.setColor('#ffa502');
        } else {
            nowPlayingEmbed.setFooter({ text: "▶️ 正在播放" });
        }

        return interaction.editReply({
            embeds: [nowPlayingEmbed]
        });
    });

module.exports = command;
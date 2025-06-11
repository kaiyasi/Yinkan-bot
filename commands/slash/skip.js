const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("skip")
    .setDescription("跳過當前歌曲")
    .setSelfDefer(true) // 設置 selfDefer 屬性，表示此指令會自行處理延遲回應
    .setRun(async (client, interaction, options) => {
        try {
            // 檢查用戶是否在語音頻道
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 請先加入語音頻道")
                            .setDescription("您需要在語音頻道中才能使用此指令")
                            .setTimestamp()
                    ],
                    flags: 1 << 6 // Discord.MessageFlags.Ephemeral
                });
            }

            // 檢查播放器是否可用
            if (!client.player) {                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 播放器未初始化")
                            .setDescription("Discord Player 尚未開始")
                            .setTimestamp()
                    ],
                    flags: 1 << 6 // Discord.MessageFlags.Ephemeral
                });
            }

            // 移除手動 deferReply，因為已設置 setSelfDefer(true)

            // 獲取播放佇列
            const queue = client.player.nodes.get(interaction.guild.id);
            if (!queue) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 沒有正在播放的音樂")
                            .setDescription("目前沒有播放佇列")
                            .setTimestamp()
                    ]
                });
            }

            // 檢查是否有當前歌曲
            const currentTrack = queue.currentTrack;
            if (!currentTrack) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 沒有可跳過的歌曲")
                            .setDescription("目前沒有歌曲正在播放")
                            .setTimestamp()
                    ]
                });
            }

            // 檢查是否有下一首歌曲或自動佇列
            const hasNextTrack = queue.tracks.data.length > 0;
            const autoQueue = queue.metadata?.autoQueue;

            if (!hasNextTrack && (!autoQueue || autoQueue === false)) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FFA500")
                            .setTitle("⚠️ 佇列即將清空")
                            .setDescription(
                                `當前歌曲：[${currentTrack.title}](${currentTrack.url})\n\n` +
                                "跳過此歌曲後佇列將為空，播放將會停止"
                            )
                            .addFields({
                                name: "💡 提示",
                                value: "您可以使用 `/play` 或 `/search` 指令添加更多歌曲",
                                inline: false
                            })
                            .setTimestamp()
                    ]
                });
            }

            // 記錄被跳過的歌曲資訊
            const skippedTrack = {
                title: currentTrack.title,
                url: currentTrack.url,
                thumbnail: currentTrack.thumbnail,
                author: currentTrack.author,
                duration: currentTrack.durationMS
            };

            // 執行跳過
            const success = queue.node.skip();
            
            if (!success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 跳過失敗")
                            .setDescription("無法跳過當前歌曲，請稍後再試")
                            .setTimestamp()
                    ]
                });
            }

            // 獲取下一首歌曲資訊
            const nextTrack = queue.currentTrack;

            const skipEmbed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("⏭️ 歌曲已跳過")
                .setDescription(`已跳過：[${skippedTrack.title}](${skippedTrack.url})`)
                .addFields([
                    {
                        name: "🎵 被跳過的歌曲",
                        value: `[${skippedTrack.title}](${skippedTrack.url})`,
                        inline: false
                    }
                ])
                .setThumbnail(skippedTrack.thumbnail)
                .setTimestamp();

            if (nextTrack) {
                skipEmbed.addFields({
                    name: "▶️ 現在播放",
                    value: `[${nextTrack.title}](${nextTrack.url})`,
                    inline: false
                });
            } else {
                skipEmbed.addFields({
                    name: "📋 佇列狀態",
                    value: hasNextTrack ? 
                        `佇列中還有 ${queue.tracks.data.length} 首歌曲` :
                        "佇列已清空",
                    inline: false
                });
            }

            return interaction.editReply({
                embeds: [skipEmbed]
            });

        } catch (error) {
            console.error('跳過歌曲時發生錯誤:', error);
            
            const errorResponse = {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("❌ 跳過失敗")
                        .setDescription("執行跳過時發生錯誤，請稍後再試")
                        .setTimestamp()
                ]
            };            if (interaction.deferred) {
                return interaction.editReply(errorResponse);
            } else {
                return interaction.reply({ ...errorResponse, flags: 1 << 6 });
            }
        }
    });

module.exports = command;
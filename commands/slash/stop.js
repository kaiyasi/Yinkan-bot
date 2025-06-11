const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("stop")
    .setDescription("停止機器人正在播放的內容並離開語音頻道\n(此指令會清空播放佇列)")
    .setSelfDefer(true) // 設置 selfDefer 屬性，表示此指令會自行處理延遲回應
    .setRun(async (client, interaction, options) => {
        try {
            // 檢查用戶是否在語音頻道
            const member = interaction.member;
            if (!member.voice.channel) {                return interaction.reply({
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

            // 獲取播放佇列
            const queue = client.player.nodes.get(interaction.guild);
            if (!queue || !queue.currentTrack) {                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 沒有正在播放的音樂")
                            .setDescription("目前沒有正在播放的內容")
                            .setTimestamp()
                    ],
                    flags: 1 << 6 // Discord.MessageFlags.Ephemeral
                });
            }

            // 移除手動 deferReply，因為已設置 setSelfDefer(true)

            // 檢查機器人是否與用戶在同一個語音頻道
            const botVoiceChannel = queue.connection?.channel;
            if (botVoiceChannel && botVoiceChannel.id !== member.voice.channel.id) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 語音頻道不匹配")
                            .setDescription(
                                `機器人目前在 <#${botVoiceChannel.id}> 頻道\n` +
                                `您需要在同一個語音頻道才能使用此指令`
                            )
                            .setTimestamp()
                    ]
                });
            }

            // 記錄停止前的狀態
            const currentTrack = queue.currentTrack;
            const queueSize = queue.tracks.data.length;
            const totalTracks = queueSize + (currentTrack ? 1 : 0);

            // 停止播放並刪除佇列
            queue.delete();

            const stopEmbed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("⏹️ 播放已停止")
                .setDescription("機器人已停止播放並離開語音頻道")
                .addFields([
                    {
                        name: "🎵 最後播放的歌曲",
                        value: currentTrack ? 
                            `[${currentTrack.title}](${currentTrack.url})` :
                            "無",
                        inline: false
                    },
                    {
                        name: "📊 清空的佇列",
                        value: totalTracks > 0 ? 
                            `已清空 ${totalTracks} 首歌曲` :
                            "佇列為空",
                        inline: true
                    },
                    {
                        name: "👤 操作者",
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    }
                ])
                .setFooter({
                    text: "使用 /play 指令重新開始播放",
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            if (currentTrack && currentTrack.thumbnail) {
                stopEmbed.setThumbnail(currentTrack.thumbnail);
            }

            return interaction.editReply({
                embeds: [stopEmbed]
            });

        } catch (error) {
            console.error('停止播放時發生錯誤:', error);
            
            const errorResponse = {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("❌ 停止失敗")
                        .setDescription("停止播放時發生錯誤，請稍後再試")
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
const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("shuffle")
    .setDescription("隨機播放佇列中的歌曲")
    .setSelfDefer(true) // 設置 selfDefer 屬性，表示此指令會自行處理延遲回應
    .setRun(async (client, interaction, options) => {
        try {
            // 檢查用戶是否在語音頻道
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 請先加入語音頻道")
                            .setDescription("您需要在語音頻道中才能使用此指令")
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }

            // 檢查播放器是否可用
            if (!client.player) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 播放器未初始化")
                            .setDescription("Discord Player 尚未開始")
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }

            await interaction.deferReply();

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

            // 檢查佇列是否有足夠的歌曲
            if (!queue.tracks || queue.tracks.data.length < 2) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 佇列中歌曲不足")
                            .setDescription("需要至少 2 首歌曲才能進行隨機播放")
                            .addFields({
                                name: "💡 提示",
                                value: "使用 `/play` 或 `/search` 指令添加更多歌曲到佇列",
                                inline: false
                            })
                            .setTimestamp()
                    ]
                });
            }

            // 記錄隨機播放前的佇列狀態
            const beforeCount = queue.tracks.data.length;
            const firstTrack = queue.tracks.data[0];
            
            // 執行隨機播放
            queue.tracks.shuffle();

            // 確認隨機播放成功
            const afterCount = queue.tracks.data.length;
            const newFirstTrack = queue.tracks.data[0];

            const shuffleEmbed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("🔀 佇列已隨機播放")
                .setDescription("播放佇列已成功重新排序")
                .addFields([
                    {
                        name: "📊 佇列統計",
                        value: `總共 ${afterCount} 首歌曲被重新排序`,
                        inline: true
                    },
                    {
                        name: "🎵 下一首歌曲",
                        value: newFirstTrack ? 
                            `[${newFirstTrack.title}](${newFirstTrack.url})` :
                            "無",
                        inline: false
                    }
                ])
                .setFooter({
                    text: "佇列順序已隨機化",
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            return interaction.editReply({
                embeds: [shuffleEmbed]
            });

        } catch (error) {
            console.error('隨機播放時發生錯誤:', error);
            
            const errorResponse = {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("❌ 隨機播放失敗")
                        .setDescription("執行隨機播放時發生錯誤，請稍後再試")
                        .setTimestamp()
                ]
            };

            if (interaction.deferred) {
                return interaction.editReply(errorResponse);
            } else {
                return interaction.reply({ ...errorResponse, ephemeral: true });
            }
        }
    });

module.exports = command;
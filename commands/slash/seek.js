const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");
const ms = require("ms");

const command = new SlashCommand()
    .setName("seek")
    .setDescription("跳轉到歌曲的指定時間點")
    .addStringOption((option) =>
        option
            .setName("time")
            .setDescription("你想跳轉的時間點。例如：1h 30m | 2h | 80m | 53s")
            .setRequired(true)
    )
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

            // 獲取播放佇列
            const queue = client.player.nodes.get(interaction.guild);
            if (!queue) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 沒有正在播放的音樂")
                            .setDescription("目前沒有播放佇列")
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }

            // 檢查是否有當前正在播放的歌曲
            const currentTrack = queue.currentTrack;
            if (!currentTrack) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 沒有正在播放的歌曲")
                            .setDescription("目前沒有歌曲正在播放")
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }

            // 檢查歌曲是否支援跳轉
            if (currentTrack.live) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 無法跳轉")
                            .setDescription("直播內容無法跳轉到指定時間點")
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            const rawArgs = interaction.options.getString("time");
            const args = rawArgs.split(' ');
            const rawTime = [];
            
            // 解析時間參數
            for (let i = 0; i < args.length; i++) {
                const timeValue = ms(args[i]);
                if (timeValue === undefined || isNaN(timeValue)) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#FF0000")
                                .setTitle("❌ 時間格式錯誤")
                                .setDescription(
                                    `無效的時間格式：\`${args[i]}\`\n\n` +
                                    "**正確格式範例：**\n" +
                                    "• `1h 30m` - 1小時30分鐘\n" +
                                    "• `2h` - 2小時\n" +
                                    "• `80m` - 80分鐘\n" +
                                    "• `53s` - 53秒\n" +
                                    "• `1m 30s` - 1分鐘30秒"
                                )
                                .setTimestamp()
                        ]
                    });
                }
                rawTime.push(timeValue);
            }
            
            const time = rawTime.reduce((a, b) => a + b, 0);

            // 獲取當前播放時間和歌曲總長度
            const timestamp = queue.node.getTimestamp();
            const position = timestamp ? timestamp.current.value : 0;
            const duration = currentTrack.durationMS || 0;

            // 檢查時間是否在有效範圍內
            if (time < 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 時間無效")
                            .setDescription("時間不能是負數")
                            .setTimestamp()
                    ]
                });
            }

            if (time > duration) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 時間超出範圍")
                            .setDescription(
                                `指定的時間 \`${ms(time, { long: true })}\` 超出了歌曲長度 \`${ms(duration, { long: true })}\`\n\n` +
                                "請檢查時間後重新嘗試"
                            )
                            .setTimestamp()
                    ]
                });
            }

            // 執行跳轉
            await queue.node.seek(time);

            // 判斷是前進還是後退
            const action = time < position ? "後退" : "前進";
            const actionEmoji = time < position ? "⏪" : "⏩";

            const seekEmbed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle(`${actionEmoji} 時間跳轉成功`)
                .setDescription(
                    `**${currentTrack.title}** 已被${action}到 **${ms(time, { colonNotation: true })}**`
                )
                .addFields([
                    {
                        name: "🎵 歌曲",
                        value: `[${currentTrack.title}](${currentTrack.url})`,
                        inline: false
                    },
                    {
                        name: "⏰ 跳轉時間",
                        value: `\`${ms(time, { colonNotation: true })}\``,
                        inline: true
                    },
                    {
                        name: "📊 歌曲進度",
                        value: `\`${ms(time, { colonNotation: true })} / ${ms(duration, { colonNotation: true })}\``,
                        inline: true
                    }
                ])
                .setThumbnail(currentTrack.thumbnail)
                .setTimestamp();

            return interaction.editReply({ embeds: [seekEmbed] });

        } catch (error) {
            console.error('跳轉時發生錯誤:', error);
            
            const errorResponse = {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("❌ 跳轉失敗")
                        .setDescription("執行時間跳轉時發生錯誤，請稍後再試")
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
const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("skipto")
    .setDescription("跳到佇列中的指定歌曲")
    .addNumberOption((option) =>
        option
            .setName("number")
            .setDescription("要跳到的歌曲編號")
            .setRequired(true)
            .setMinValue(1)
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

            await interaction.deferReply();

            const position = interaction.options.getNumber("number");

            // 檢查佇列是否為空
            const queueSize = queue.tracks.data.length;
            if (queueSize === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 佇列為空")
                            .setDescription("佇列中沒有歌曲可以跳轉")
                            .addFields({
                                name: "💡 提示",
                                value: "使用 `/play` 或 `/search` 指令添加歌曲到佇列",
                                inline: false
                            })
                            .setTimestamp()
                    ]
                });
            }

            // 檢查位置是否有效
            if (!position || position < 1 || position > queueSize) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 位置無效")
                            .setDescription(
                                `請輸入 1 到 ${queueSize} 之間的數字\n\n` +
                                `您輸入的位置：\`${position}\``
                            )
                            .addFields({
                                name: "📋 當前佇列",
                                value: `佇列中共有 ${queueSize} 首歌曲`,
                                inline: false
                            })
                            .setTimestamp()
                    ]
                });
            }

            // 獲取目標歌曲資訊
            const targetTrack = queue.tracks.data[position - 1];
            const currentTrack = queue.currentTrack;

            // 跳到指定位置
            const success = await queue.node.skipTo(position - 1); // skipTo 使用 0 基準索引

            if (!success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 跳轉失敗")
                            .setDescription("無法跳到指定歌曲，請稍後再試")
                            .setTimestamp()
                    ]
                });
            }

            const skipEmbed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("⏭️ 已跳轉到指定歌曲")
                .setDescription(`已跳到第 ${position} 首歌曲`)
                .addFields([
                    {
                        name: "🎵 現在播放",
                        value: `[${targetTrack.title}](${targetTrack.url})`,
                        inline: false
                    },
                    {
                        name: "👤 添加者",
                        value: `<@${targetTrack.requestedBy?.id || "未知"}>`,
                        inline: true
                    },
                    {
                        name: "⏰ 歌曲長度",
                        value: targetTrack.live ? 
                            "`🔴 直播`" : 
                            `\`${client.ms ? client.ms(targetTrack.durationMS, { colonNotation: true }) : "未知"}\``,
                        inline: true
                    },
                    {
                        name: "📊 佇列位置",
                        value: `第 ${position} 首 / 共 ${queueSize + 1} 首`,
                        inline: true
                    }
                ])
                .setThumbnail(targetTrack.thumbnail)
                .setTimestamp();

            if (currentTrack && currentTrack.title !== targetTrack.title) {
                skipEmbed.addFields({
                    name: "⏭️ 已跳過",
                    value: `[${currentTrack.title}](${currentTrack.url})`,
                    inline: false
                });
            }

            return interaction.editReply({
                embeds: [skipEmbed]
            });

        } catch (error) {
            console.error('跳轉到指定歌曲時發生錯誤:', error);
            
            const errorResponse = {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("❌ 跳轉失敗")
                        .setDescription("執行跳轉時發生錯誤，請稍後再試")
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
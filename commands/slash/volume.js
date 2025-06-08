const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("volume")
    .setDescription("更改正在播放歌曲的音量")
    .addNumberOption((option) =>
        option
            .setName("amount")
            .setDescription("你想要更改的音量大小（1-125）")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(125)
    )
    .setSelfDefer(true) // 設置 selfDefer 屬性，表示此指令會自行處理延遲回應
    .setRun(async (client, interaction) => {
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

            const vol = interaction.options.getNumber("amount");
            const currentVolume = queue.node.volume;

            // 如果沒有提供音量參數，顯示當前音量
            if (!vol) {
                const volumeEmbed = new EmbedBuilder()
                    .setColor("#0099FF")
                    .setTitle("🔊 當前音量")
                    .setDescription(`目前音量設置為 **${currentVolume}%**`)
                    .addFields([
                        {
                            name: "💡 使用方法",
                            value: "使用 `/volume <數字>` 來調整音量（1-125）",
                            inline: false
                        },
                        {
                            name: "📊 音量範圍",
                            value: "• 最小值：1%\n• 最大值：125%\n• 建議值：50-100%",
                            inline: false
                        }
                    ])
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [volumeEmbed]
                });
            }

            // 驗證音量範圍
            if (vol < 1 || vol > 125) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 音量範圍無效")
                            .setDescription(
                                `音量必須在 1 到 125 之間\n\n` +
                                `您輸入的音量：\`${vol}\``
                            )
                            .addFields({
                                name: "📊 當前音量",
                                value: `${currentVolume}%`,
                                inline: true
                            })
                            .setTimestamp()
                    ]
                });
            }

            // 設置新音量
            const success = queue.node.setVolume(vol);
            
            if (!success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 音量調整失敗")
                            .setDescription("無法調整音量，請稍後再試")
                            .setTimestamp()
                    ]
                });
            }

            // 生成音量條視覺效果
            const volumeBar = "█".repeat(Math.floor(vol / 5)) + "░".repeat(25 - Math.floor(vol / 5));
            
            // 判斷音量等級和相應的表情符號
            let volumeEmoji;
            let volumeLevel;
            if (vol <= 25) {
                volumeEmoji = "🔈";
                volumeLevel = "低";
            } else if (vol <= 75) {
                volumeEmoji = "🔉";
                volumeLevel = "中";
            } else {
                volumeEmoji = "🔊";
                volumeLevel = "高";
            }

            const volumeEmbed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle(`${volumeEmoji} 音量已調整`)
                .setDescription(`音量已從 **${currentVolume}%** 調整為 **${vol}%**`)
                .addFields([
                    {
                        name: "🎛️ 音量等級",
                        value: `${volumeLevel} (${vol}%)`,
                        inline: true
                    },
                    {
                        name: "👤 調整者",
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: "📊 音量條",
                        value: `\`${volumeBar}\` ${vol}%`,
                        inline: false
                    }
                ])
                .setFooter({
                    text: "使用 /volume 不帶參數來查看當前音量",
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            // 如果有當前播放的歌曲，添加歌曲資訊
            if (queue.currentTrack) {
                volumeEmbed.addFields({
                    name: "🎵 正在播放",
                    value: `[${queue.currentTrack.title}](${queue.currentTrack.url})`,
                    inline: false
                });
            }

            return interaction.editReply({
                embeds: [volumeEmbed]
            });

        } catch (error) {
            console.error('調整音量時發生錯誤:', error);
            
            const errorResponse = {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("❌ 音量調整失敗")
                        .setDescription("調整音量時發生錯誤，請稍後再試")
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
const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("summon")
    .setDescription("召喚機器人到您的語音頻道")
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
                            .setDescription("您需要在語音頻道中才能召喚機器人")
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }

            // 檢查機器人權限
            const permissions = voiceChannel.permissionsFor(client.user);
            if (!permissions.has("Connect") || !permissions.has("Speak")) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ 權限不足")
                            .setDescription(
                                "機器人需要以下權限才能加入語音頻道：\n" +
                                "• 連接\n" +
                                "• 說話"
                            )
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

            // 獲取或創建播放器
            let queue = client.player.nodes.get(interaction.guild.id);
            
            if (!queue) {
                // 創建新的播放器
                queue = client.player.nodes.create(interaction.guild, {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild.members.me,
                        requestedBy: interaction.user,
                    },
                    selfDeaf: true,
                    volume: client.config.opt?.defaultvolume || 50,
                    leaveOnEmpty: client.config.opt?.leaveOnEmpty || true,
                    leaveOnEmptyCooldown: client.config.opt?.leaveOnEmptyCooldown || 5000,
                    leaveOnEnd: client.config.opt?.leaveOnEnd || true,
                    leaveOnEndCooldown: client.config.opt?.leaveOnEndCooldown || 5000,
                });
            }

            // 檢查機器人是否已經在語音頻道中
            if (queue.connection) {
                const currentChannel = queue.connection.channel;
                
                if (currentChannel.id === voiceChannel.id) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#FFA500")
                                .setTitle("⚠️ 機器人已在此頻道")
                                .setDescription(`機器人已經在 <#${voiceChannel.id}> 頻道中`)
                                .setTimestamp()
                        ]
                    });
                } else {
                    // 移動到新的語音頻道
                    await queue.connect(voiceChannel);
                    
                    const moveEmbed = new EmbedBuilder()
                        .setColor("#00FF00")
                        .setTitle("🔄 已移動頻道")
                        .setDescription(`機器人已從 <#${currentChannel.id}> 移動到 <#${voiceChannel.id}>`)
                        .addFields([
                            {
                                name: "👤 請求者",
                                value: `<@${interaction.user.id}>`,
                                inline: true
                            },
                            {
                                name: "🎵 新頻道",
                                value: `<#${voiceChannel.id}>`,
                                inline: true
                            }
                        ])
                        .setTimestamp();

                    return interaction.editReply({
                        embeds: [moveEmbed]
                    });
                }
            } else {
                // 連接到語音頻道
                await queue.connect(voiceChannel);
                
                const joinEmbed = new EmbedBuilder()
                    .setColor("#00FF00")
                    .setTitle("✅ 已加入語音頻道")
                    .setDescription(`機器人已成功加入 <#${voiceChannel.id}>`)
                    .addFields([
                        {
                            name: "👤 召喚者",
                            value: `<@${interaction.user.id}>`,
                            inline: true
                        },
                        {
                            name: "🎵 頻道",
                            value: `<#${voiceChannel.id}>`,
                            inline: true
                        },
                        {
                            name: "🔊 音量",
                            value: `${queue.node.volume}%`,
                            inline: true
                        }
                    ])
                    .setFooter({
                        text: "使用 /play 指令開始播放音樂",
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [joinEmbed]
                });
            }

        } catch (error) {
            console.error('召喚機器人時發生錯誤:', error);
            
            const errorResponse = {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("❌ 召喚失敗")
                        .setDescription("召喚機器人時發生錯誤，請稍後再試")
                        .addFields({
                            name: "錯誤詳情",
                            value: error.message || "未知錯誤",
                            inline: false
                        })
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
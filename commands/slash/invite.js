const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("invite")
    .setDescription("獲取機器人邀請連結")
    .setSelfDefer(true)
    .setRun(async (client, interaction, options) => {
        await interaction.deferReply();
        
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`🤖 邀請 ${client.user.username}`)
                    .setDescription(`點擊下方按鈕邀請我到你的伺服器！\n\n✨ 功能包括：\n🎵 播放音樂\n🎛️ 音頻濾鏡\n📋 播放佇列管理\n🔄 循環播放\n🎤 動態語音頻道`)
                    .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                    .setFooter({
                        text: `${client.user.username} • 音樂機器人`,
                        iconURL: client.user.displayAvatarURL({ dynamic: true })
                    }),
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel("🔗 邀請機器人")
                        .setStyle("Link")
                        .setURL(
                            `https://discord.com/oauth2/authorize?client_id=${
                                client.config.clientId
                            }&permissions=${
                                client.config.permissions
                            }&scope=${client.config.inviteScopes
                                .toString()
                                .replace(/,/g, "%20")}`
                        )
                ),
            ],
        });
    });

module.exports = command;
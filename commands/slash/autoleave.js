const colors = require("colors");
const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("autoleave")
    .setDescription("設置機器人在語音頻道空閒時自動離開")
    .setRun(async (client, interaction) => {
        let channel = await client.getChannel(client, interaction);
        if (!channel) return;
        
        let player;
        if (client.player) {
            player = client.player.nodes.get(interaction.guild.id);
        } else {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("RED")
                        .setDescription("Lavalink 節點未連接"),
                ],
            });
        }
        
        if (!player) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("RED")
                        .setDescription("目前沒有正在播放內容"),
                ],
                ephemeral: true,
            });
        }
        
        let autoLeaveEmbed = new EmbedBuilder().setColor(client.config.embedColor);
        const autoLeave = player.metadata?.autoLeave || false;
        
        if (!autoLeave) {
            if (!player.metadata) player.metadata = {};
            player.metadata.autoLeave = true;
        } else {
            player.metadata.autoLeave = false;
        }
        
        const newAutoLeave = player.metadata.autoLeave;
        
        autoLeaveEmbed
            .setDescription(`**自動離開模式已** \`${newAutoLeave ? "啟用" : "關閉"}\``)
            .setFooter({
                text: `機器人將${newAutoLeave ? "會在" : "不會"}語音頻道空閒時自動離開。`
            });
            
        client.warn(
            `播放器 ${player.guild.id} | [${colors.blue(
                "自動離開",
            )}] 已被 [${colors.blue(
                newAutoLeave ? "啟用" : "禁用",
            )}] 在 ${
                client.guilds.cache.get(player.guild.id)
                    ? client.guilds.cache.get(player.guild.id).name
                    : "未知伺服器"
            }`,
        );
        
        return interaction.reply({ embeds: [autoLeaveEmbed] });
    });

module.exports = command;
const colors = require("colors");
const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("autopause")
    .setDescription("設置機器人在語音頻道空閒時自動暫停")
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
        
        let autoPauseEmbed = new EmbedBuilder().setColor(client.config.embedColor);
        const autoPause = player.metadata?.autoPause || false;
        
        if (!autoPause) {
            if (!player.metadata) player.metadata = {};
            player.metadata.autoPause = true;
        } else {
            player.metadata.autoPause = false;
        }
        
        const newAutoPause = player.metadata.autoPause;
        
        autoPauseEmbed
            .setDescription(`**自動暫停模式已** \`${newAutoPause ? "啟用" : "關閉"}\``)
            .setFooter({
                text: `機器人將${newAutoPause ? "會在" : "不會"}語音頻道空閒時自動暫停。`
            });
            
        client.warn(
            `播放器 ${player.guild.id} | [${colors.blue(
                "自動暫停",
            )}] 已被 [${colors.blue(
                newAutoPause ? "啟用" : "禁用",
            )}] 在 ${
                client.guilds.cache.get(player.guild.id)
                    ? client.guilds.cache.get(player.guild.id).name
                    : "未知伺服器"
            }`,
        );
        
        return interaction.reply({ embeds: [autoPauseEmbed] });
    });

module.exports = command;
const colors = require("colors");
const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("247")
    .setDescription("持續播放音樂，機器人將保持連接")
    .setRun(async (client, interaction, options) => {
        let channel = await client.getChannel(client, interaction);
        if (!channel) {
            return;
        }
        
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
                        .setDescription("沒有任何內容可以 24/7 播放"),
                ],
                ephemeral: true,
            });
        }
        
        let twentyFourSevenEmbed = new EmbedBuilder().setColor(
            client.config.embedColor
        );
        const twentyFourSeven = player.metadata?.twentyFourSeven || false;
        
        if (!twentyFourSeven) {
            if (!player.metadata) player.metadata = {};
            player.metadata.twentyFourSeven = true;
        } else {
            player.metadata.twentyFourSeven = false;
        }
        
        const newTwentyFourSeven = player.metadata.twentyFourSeven;
        
        twentyFourSevenEmbed
            .setDescription(`**24/7 模式已** \`${newTwentyFourSeven ? "啟用" : "關閉"}\``)
            .setFooter({
                text: `機器人將${newTwentyFourSeven ? "維持" : "不再"} 24/7 保持連接到語音頻道。`
            });
            
        client.warn(
            `播放器 ${player.guild.id} | [${colors.blue(
                "24/7",
            )}] 已被 [${colors.blue(
                newTwentyFourSeven ? "啟用" : "禁用",
            )}] 在 ${
                client.guilds.cache.get(player.guild.id)
                    ? client.guilds.cache.get(player.guild.id).name
                    : "未知伺服器"
            }`,
        );
        
        if (!player.isPlaying() && player.queue.size === 0 && !newTwentyFourSeven) {
            player.delete();
        }
        
        return interaction.reply({ embeds: [twentyFourSevenEmbed] });
    });

module.exports = command;
const colors = require("colors");
const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("autoqueue")
    .setDescription("設置自動佇列模式，當佇列播放完畢時自動添加相關歌曲")
    .setSelfDefer(true)
    .setRun(async (client, interaction) => {
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
                        .setDescription("目前沒有正在播放內容"),
                ],
                ephemeral: true,
            });
        }
        
        let autoQueueEmbed = new EmbedBuilder().setColor(client.config.embedColor);
        const autoQueue = player.metadata?.autoQueue || false;
        
        if (!autoQueue) {
            if (!player.metadata) player.metadata = {};
            player.metadata.autoQueue = true;
        } else {
            player.metadata.autoQueue = false;
        }
        
        const newAutoQueue = player.metadata.autoQueue;
        
        autoQueueEmbed
            .setDescription(`**自動佇列模式已** \`${newAutoQueue ? "啟用" : "關閉"}\``)
            .setFooter({
                text: `機器人將${newAutoQueue ? "會在佇列結束時自動添加相關歌曲" : "不會自動添加歌曲到佇列"}`
            });
            
        client.warn(
            `播放器 ${player.guild.id} | [${colors.blue(
                "自動佇列",
            )}] 已被 [${colors.blue(
                newAutoQueue ? "啟用" : "禁用",
            )}] 在 ${
                client.guilds.cache.get(player.guild.id)
                    ? client.guilds.cache.get(player.guild.id).name
                    : "未知伺服器"
            }`,
        );
        
        return interaction.reply({ embeds: [autoQueueEmbed] });
    });

module.exports = command;
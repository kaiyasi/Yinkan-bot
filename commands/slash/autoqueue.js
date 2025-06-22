const colors = require("colors");
const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("autoqueue")
    .setDescription("設置自動佇列模式，當佇列播放完畢時自動添加相關歌曲")
    .setSelfDefer(true)
    .setRun(async (client, interaction) => {
        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue) {
            return interaction.reply({
                embeds: [client.ErrorEmbed("目前沒有正在播放內容。")],
                ephemeral: true,
            });
        }

        // 檢查用戶是否在同一個語音頻道
        if (interaction.member.voice.channelId !== queue.channel.id) {
            return interaction.reply({
                embeds: [client.ErrorEmbed("您需要和機器人在同一個語音頻道才能使用此指令。")],
                ephemeral: true,
            });
        }
        
        const autoQueue = queue.metadata?.autoQueue || false;
        
        // 切換模式
        queue.metadata.autoQueue = !autoQueue;
        const newAutoQueue = queue.metadata.autoQueue;
        
        const autoQueueEmbed = client.SuccessEmbed(`**自動佇列模式已** \`${newAutoQueue ? "啟用" : "關閉"}\``)
            .setFooter({
                text: `機器人將${newAutoQueue ? "會在佇列結束時自動添加相關歌曲" : "不會自動添加歌曲到佇列"}`
            });
            
        client.warn(
            `播放器 ${queue.guild.id} | [${colors.blue(
                "自動佇列",
            )}] 已被 [${colors.blue(
                newAutoQueue ? "啟用" : "禁用",
            )}] 在 ${
                client.guilds.cache.get(queue.guild.id)
                    ? client.guilds.cache.get(queue.guild.id).name
                    : "未知伺服器"
            }`,
        );
        
        return interaction.reply({ embeds: [autoQueueEmbed] });
    });

module.exports = command;
const colors = require("colors");
const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("autopause")
    .setDescription("設置機器人在語音頻道空閒時自動暫停")
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
        
        const autoPause = queue.metadata?.autoPause || false;
        
        // 切換模式
        queue.metadata.autoPause = !autoPause;
        const newAutoPause = queue.metadata.autoPause;
        
        const autoPauseEmbed = client.SuccessEmbed(`**自動暫停模式已** \`${newAutoPause ? "啟用" : "關閉"}\``)
            .setFooter({
                text: `機器人將${newAutoPause ? "會在" : "不會"}語音頻道空閒時自動暫停。`
            });
            
        client.warn(
            `播放器 ${queue.guild.id} | [${colors.blue(
                "自動暫停",
            )}] 已被 [${colors.blue(
                newAutoPause ? "啟用" : "禁用",
            )}] 在 ${
                client.guilds.cache.get(queue.guild.id)
                    ? client.guilds.cache.get(queue.guild.id).name
                    : "未知伺服器"
            }`,
        );
        
        return interaction.reply({ embeds: [autoPauseEmbed] });
    });

module.exports = command;
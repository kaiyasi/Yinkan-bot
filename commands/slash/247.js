const colors = require("colors");
const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("247")
    .setDescription("持續播放音樂，機器人將保持連接")
    .setSelfDefer(true)
    .setRun(async (client, interaction, options) => {
        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue) {
            return interaction.reply({
                embeds: [client.ErrorEmbed("目前沒有正在播放內容，無法啟用 24/7 模式。")],
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
        
        const twentyFourSeven = queue.metadata?.twentyFourSeven || false;
        
        // 切換模式
        queue.metadata.twentyFourSeven = !twentyFourSeven;
        const newTwentyFourSeven = queue.metadata.twentyFourSeven;
        
        const embed = client.SuccessEmbed(`**24/7 模式已** \`${newTwentyFourSeven ? "啟用" : "關閉"}\``)
            .setFooter({
                text: `機器人將${newTwentyFourSeven ? "維持" : "不再"} 24/7 保持連接到語音頻道。`
            });
            
        client.warn(
            `播放器 ${queue.guild.id} | [${colors.blue(
                "24/7",
            )}] 已被 [${colors.blue(
                newTwentyFourSeven ? "啟用" : "禁用",
            )}] 在 ${
                client.guilds.cache.get(queue.guild.id)
                    ? client.guilds.cache.get(queue.guild.id).name
                    : "未知伺服器"
            }`,
        );
        
        if (!queue.node.isPlaying() && queue.tracks.size === 0 && !newTwentyFourSeven) {
            queue.delete();
        }
        
        return interaction.reply({ embeds: [embed] });
    });

module.exports = command;
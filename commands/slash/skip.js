const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("skip")
    .setDescription("跳過當前歌曲")
    .setSelfDefer(true)
    .setRun(async (client, interaction) => {
        await interaction.deferReply();

        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.editReply({ embeds: [client.ErrorEmbed("目前沒有正在播放的音樂。")] });
        }

        const skippedTrack = queue.currentTrack;
        const success = queue.node.skip();

        if (success) {
            const skipEmbed = client.SuccessEmbed(`⏭️ | 已跳過 **${skippedTrack.title}**`)
                .setThumbnail(skippedTrack.thumbnail);
            
            if (queue.currentTrack) {
                skipEmbed.addFields({
                    name: "🎵 現在播放",
                    value: `[${queue.currentTrack.title}](${queue.currentTrack.url})`
                });
            } else {
                skipEmbed.setFooter({ text: "佇列已結束。" });
            }
            
            return interaction.editReply({ embeds: [skipEmbed] });
        } else {
            return interaction.editReply({ embeds: [client.ErrorEmbed("跳過歌曲時發生錯誤。")] });
        }
    });

module.exports = command;
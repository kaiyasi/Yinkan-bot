const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("stop")
    .setDescription("停止播放並清空佇列")
    .setRun(async (client, interaction) => {
        await interaction.deferReply();

        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.editReply({ embeds: [client.ErrorEmbed("目前沒有正在播放音樂。")] });
        }

        queue.delete();

        return interaction.editReply({
            embeds: [client.SuccessEmbed("⏹️ | 播放已停止，佇列已清空。")]
        });
    });

module.exports = command;
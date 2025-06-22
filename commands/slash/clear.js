const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("clear")
  .setDescription("清空播放佇列")
  .setSelfDefer(true)
  .setRun(async (client, interaction, options) => {
    await interaction.deferReply();
    
    const queue = client.player.nodes.get(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.editReply({
        embeds: [client.ErrorEmbed("目前沒有歌曲正在播放")],
        ephemeral: true,
      });
    }

    if (!queue.tracks || queue.tracks.data.length === 0) {
      return interaction.editReply({
        embeds: [client.MusicEmbed("播放佇列已為空")],
        ephemeral: true,
      });
    }

    queue.tracks.clear();
    
    return interaction.editReply({
      embeds: [client.SuccessEmbed("📋 | 播放佇列已清空")]
    });
  });

module.exports = command;
const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("clear")
  .setDescription("清空播放佇列")
  .setSelfDefer(true)  .setRun(async (client, interaction, options) => {
    await interaction.deferReply();
    
    let channel = await client.getChannel(client, interaction);
    if (!channel) {
      return;
    }

    let player;
    if (client.player) {
      player = client.player.nodes.get(interaction.guild.id);    } else {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("RED")
            .setDescription("Lavalink 節點未連接")
        ],
      });
    }    if (!player) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("RED")
            .setDescription("目前沒有歌曲正在播放")
        ],
        ephemeral: true,
      });
    }

    if (!player.queue || !player.queue.length || player.queue.length === 0) {
      let cembed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setDescription("播放佇列已為空");      return interaction.editReply({
        embeds: [cembed],
        ephemeral: true,
      });
    }

    player.queue.clear();
    
    let clearEmbed = new EmbedBuilder()
      .setColor(client.config.embedColor)
      .setDescription(`📋 | 播放佇列已清空`);
      return interaction.editReply({
      embeds: [clearEmbed]
    });
  });

module.exports = command;
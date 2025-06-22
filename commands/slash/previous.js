const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("previous")
  .setDescription("返回播放上一首歌曲")
  .setSelfDefer(true)
  .setRun(async (client, interaction) => {
    await interaction.deferReply();

    const queue = client.player.nodes.get(interaction.guild.id);
    if (!queue || !queue.history || !queue.history.hasPrevious()) {
      return interaction.editReply({
        embeds: [client.ErrorEmbed("播放歷史中沒有可以返回的歌曲。")],
        ephemeral: true,
      });
    }

    try {
      await queue.history.back();
      
      return interaction.editReply({
        embeds: [client.SuccessEmbed("⏮️ | 已返回上一首歌曲。")],
      });
    } catch (error) {
      console.error("Previous 指令錯誤:", error);
      return interaction.editReply({
        embeds: [client.ErrorEmbed("返回上一首歌曲時發生錯誤。")],
        ephemeral: true,
      });
    }
  });

module.exports = command;
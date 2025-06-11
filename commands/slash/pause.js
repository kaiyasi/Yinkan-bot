const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("pause")
  .setDescription("暫停目前播放的音樂")
  .setSelfDefer(true)  .setRun(async (client, interaction, options) => {
    try {
      const queue = client.player.nodes.get(interaction.guild);
      if (!queue || !queue.currentTrack) {
        const noMusicEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("❌ 沒有正在播放的音樂")
          .setDescription("目前沒有任何音樂在播放")
          .setTimestamp();        return interaction.editReply({
          embeds: [noMusicEmbed],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      }

      const member = interaction.member;
      if (!member.voice.channel) {
        const noVoiceEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("❌ 請先加入語音頻道")
          .setDescription("您需要在語音頻道中才能使用此指令")
          .setTimestamp();        return interaction.editReply({
          embeds: [noVoiceEmbed],
          flags: 1 << 6, // Discord.MessageFlags.Ephemeral
        });
      }

      if (member.voice.channel !== interaction.guild.members.me.voice.channel) {
        const differentChannelEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("❌ 語音頻道不匹配")
          .setDescription("您需要與機器人在同一個語音頻道中")
          .setTimestamp();        return interaction.editReply({
          embeds: [differentChannelEmbed],
          flags: 1 << 6, // Discord.MessageFlags.Ephemeral
        });
      }

      if (queue.node.isPaused()) {
        const alreadyPausedEmbed = new EmbedBuilder()
          .setColor("#FFA500")
          .setTitle("⚠️ 音樂已經暫停")
          .setDescription("音樂播放已經處於暫停狀態")
          .setTimestamp();        return interaction.editReply({
          embeds: [alreadyPausedEmbed],
          flags: 1 << 6, // Discord.MessageFlags.Ephemeral
        });
      }

      queue.node.setPaused(true);
      
      const pausedEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("⏸️ 音樂已暫停")
        .setDescription(`**${queue.currentTrack.title}** 已暫停播放`)
        .addFields(
          { name: "歌曲", value: queue.currentTrack.title, inline: true },
          { name: "時長", value: queue.currentTrack.duration, inline: true }
        )
        .setTimestamp();

      return interaction.editReply({
        embeds: [pausedEmbed],
      });

    } catch (error) {
      console.error("暫停指令錯誤:", error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ 發生錯誤")
        .setDescription("暫停音樂時發生錯誤，請稍後再試")
        .setTimestamp();

      try {        return interaction.editReply({
          embeds: [errorEmbed],
          flags: 1 << 6, // Discord.MessageFlags.Ephemeral
        });
      } catch (followUpError) {
        console.error("無法回覆互動:", followUpError);
      }
    }
  });

module.exports = command;
const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("resume")
  .setDescription("繼續播放目前暫停的音樂")
  .setSelfDefer(true)
  .setRun(async (client, interaction, options) => {
    try {
      const queue = client.player.nodes.get(interaction.guild);
      
      if (!queue || !queue.currentTrack) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 沒有正在播放的音樂")
              .setDescription("目前沒有音樂在播放")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      }

      const member = interaction.member;
      if (!member.voice.channel) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 請先加入語音頻道")
              .setDescription("您需要在語音頻道中才能使用此指令")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      }

      // 檢查用戶是否與機器人在同一語音頻道
      if (member.voice.channel !== interaction.guild.members.me.voice.channel) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 語音頻道不匹配")
              .setDescription("您需要與機器人在同一個語音頻道中")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      }

      if (!queue.node.isPaused()) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FFA500")
              .setTitle("⚠️ 音樂已在播放中")
              .setDescription("音樂播放未被暫停")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      }

      queue.node.setPaused(false);

      // 更新控制面板
      try {
        if (queue.metadata && queue.metadata.controllerMessage) {
          await client.updatePlayerController(queue.metadata.controllerMessage, queue);
        }
      } catch (error) {
        console.error('更新控制面板錯誤:', error);
      }

      const resumeEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("▶️ 已恢復播放")
        .setDescription(`**${queue.currentTrack.title}** 繼續播放`)
        .addFields(
          { name: "歌曲", value: queue.currentTrack.title, inline: true },
          { name: "作者", value: queue.currentTrack.author, inline: true },
          { name: "時長", value: queue.currentTrack.duration, inline: true }
        )
        .setTimestamp();

      if (queue.currentTrack.thumbnail) {
        resumeEmbed.setThumbnail(queue.currentTrack.thumbnail);
      }

      return interaction.reply({
        embeds: [resumeEmbed],
      });

    } catch (error) {
      console.error("Resume 指令錯誤:", error);
      
      try {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 發生錯誤")
              .setDescription("恢復播放時發生錯誤，請稍後再試")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      } catch (replyError) {
        console.error("無法回覆 resume 指令:", replyError);
      }
    }
  });

module.exports = command;
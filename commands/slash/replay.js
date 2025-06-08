const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("replay")
  .setDescription("重新播放當前正在播放的歌曲")
  .setSelfDefer(true)
  .setRun(async (client, interaction, options) => {
    try {
      // 檢查用戶是否在語音頻道
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
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

      // 獲取播放佇列
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

      // 檢查用戶是否與機器人在同一語音頻道
      if (voiceChannel !== interaction.guild.members.me.voice.channel) {
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

      const currentTrack = queue.currentTrack;

      await interaction.deferReply();

      // 將播放位置重置到開始
      await queue.node.seek(0);

      const replayEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("⏪ 重新播放")
        .setDescription(`**[${currentTrack.title}](${currentTrack.url})**`)
        .addFields([
          {
            name: "👤 請求者",
            value: currentTrack.requestedBy?.toString() || "未知",
            inline: true
          },
          {
            name: "👨‍🎤 作者",
            value: currentTrack.author || "未知",
            inline: true
          },
          {
            name: "⏰ 時長",
            value: currentTrack.duration || "即時播放",
            inline: true
          }
        ])
        .setTimestamp();

      if (currentTrack.thumbnail) {
        replayEmbed.setThumbnail(currentTrack.thumbnail);
      }

      return interaction.editReply({
        embeds: [replayEmbed]
      });

    } catch (error) {
      console.error('重新播放錯誤:', error);
      
      try {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 重新播放失敗")
              .setDescription("重新播放歌曲時發生錯誤，請稍後再試")
              .addFields({
                name: "錯誤詳情",
                value: error.message.length > 1000 ? error.message.substring(0, 1000) + "..." : error.message,
                inline: false
              })
              .setTimestamp()
          ]
        });
      } catch (replyError) {
        console.error("無法回覆 replay 指令:", replyError);
      }
    }
  });

module.exports = command;
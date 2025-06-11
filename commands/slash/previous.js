const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("previous")
  .setDescription("返回播放上一首歌曲")
  .setSelfDefer(true)
  .setRun(async (client, interaction) => {
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

      // 檢查機器人播放器是否已初始化
      if (!client.player) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 播放器未初始化")
              .setDescription("Discord Player 尚未開始")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      }

      // 獲取當前播放器
      const player = client.player.nodes.get(interaction.guild.id);
      if (!player) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 沒有播放器")
              .setDescription("此伺服器沒有正在播放的音樂")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      }

      // 檢查是否有上一首歌曲
      const previousTrack = player.queue.history.previousTrack;
      if (!previousTrack) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FFA500")
              .setTitle("⚠️ 沒有上一首歌曲")
              .setDescription("播放歷史中沒有可以返回的歌曲")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      }

      // 檢查是否有當前播放的歌曲
      const currentTrack = player.queue.currentTrack;
      if (!currentTrack) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 沒有正在播放的音樂")
              .setDescription("目前沒有正在播放的音樂")
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

      // 將當前歌曲插入到隊列的第一位
      player.queue.insertTrack(currentTrack, 0);
      
      // 播放上一首歌曲
      await player.play(previousTrack);

      // 回應成功訊息
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("⏮️ 返回上一首")
            .setDescription(`正在播放: **${previousTrack.title}**`)
            .addFields(
              { name: "歌曲", value: previousTrack.title, inline: true },
              { name: "作者", value: previousTrack.author, inline: true },
              { name: "時長", value: previousTrack.duration, inline: true }
            )
            .setThumbnail(previousTrack.thumbnail)
            .setTimestamp()
        ],
      });

    } catch (error) {
      console.error("Previous 指令錯誤:", error);
      
      try {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 發生錯誤")
              .setDescription("返回上一首歌曲時發生錯誤，請稍後再試")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      } catch (replyError) {
        console.error("無法回覆 previous 指令:", replyError);
      }
    }
  });

module.exports = command;
const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("remove")
  .setDescription("從佇列中移除指定的歌曲")
  .addNumberOption((option) =>
    option
      .setName("number")
      .setDescription("輸入要移除歌曲的編號")
      .setRequired(true)
      .setMinValue(1)
  )
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

      // 檢查播放佇列
      const queue = client.player.nodes.get(interaction.guild);
      if (!queue || !queue.currentTrack) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 沒有正在播放的音樂")
              .setDescription("目前沒有播放佇列")
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

      await interaction.deferReply();

      const trackNumber = interaction.options.getNumber("number");
      const position = trackNumber - 1; // 轉換為 0 基底的索引

      // 檢查佇列是否為空
      const queueSize = queue.tracks.data.length;
      if (queueSize === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FFA500")
              .setTitle("⚠️ 佇列為空")
              .setDescription("佇列中沒有可以移除的歌曲")
              .setTimestamp()
          ]
        });
      }

      // 檢查位置是否有效
      if (position < 0 || position >= queueSize) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 編號錯誤")
              .setDescription(`歌曲編號必須在 1 到 ${queueSize} 之間\n佇列中共有 **${queueSize}** 首歌曲`)
              .addFields({
                name: "💡 提示",
                value: "使用 `/queue` 指令查看完整的播放佇列",
                inline: false
              })
              .setTimestamp()
          ]
        });
      }

      // 獲取要移除的歌曲
      const trackToRemove = queue.tracks.data[position];

      // 移除歌曲
      queue.tracks.remove(position, 1);

      const removeEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("✅ 歌曲已移除")
        .setDescription(`已從佇列中移除第 **${trackNumber}** 首歌曲`)
        .addFields([
          {
            name: "🎵 移除的歌曲",
            value: `[${trackToRemove.title}](${trackToRemove.url})`,
            inline: false
          },
          {
            name: "👤 請求者",
            value: trackToRemove.requestedBy?.toString() || "未知",
            inline: true
          },
          {
            name: "⏱️ 時長",
            value: trackToRemove.duration || "未知",
            inline: true
          },
          {
            name: "📊 佇列狀態",
            value: `剩餘 ${queueSize - 1} 首歌曲`,
            inline: true
          }
        ])
        .setThumbnail(trackToRemove.thumbnail || null)
        .setTimestamp();

      return interaction.editReply({
        embeds: [removeEmbed]
      });

    } catch (error) {
      console.error('移除歌曲錯誤:', error);
      
      try {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 移除失敗")
              .setDescription("移除歌曲時發生錯誤，請稍後再試")
              .addFields({
                name: "錯誤詳情",
                value: error.message.length > 1000 ? error.message.substring(0, 1000) + "..." : error.message,
                inline: false
              })
              .setTimestamp()
          ]
        });
      } catch (replyError) {
        console.error("無法回覆 remove 指令:", replyError);
      }
    }
  });

module.exports = command;
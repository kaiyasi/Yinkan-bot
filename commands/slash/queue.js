const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

// 動態導入 pretty-ms
let pms;
(async () => {
  try {
    pms = (await import('pretty-ms')).default;
  } catch (error) {
    console.error("無法載入 pretty-ms:", error);
  }
})();

const command = new SlashCommand()
  .setName("queue")
  .setDescription("顯示播放佇列")
  .setSelfDefer(true)
  .setRun(async (client, interaction) => {
    try {
      const queue = client.player.nodes.get(interaction.guild);
      
      if (!queue || !queue.currentTrack) {        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 沒有正在播放的音樂")
              .setDescription("目前沒有音樂在播放")
              .setTimestamp()
          ],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      }

      const currentTrack = queue.currentTrack;
      const tracks = queue.tracks.data || [];

      // 如果佇列為空
      if (tracks.length === 0) {
        const emptyQueueEmbed = new EmbedBuilder()
          .setColor("#0099FF")
          .setTitle("🎵 播放佇列")
          .setDescription(`**🎵 正在播放**\n[${currentTrack.title}](${currentTrack.url})\n\n**📋 佇列狀態**\n佇列中沒有其他歌曲`)
          .addFields([
            {
              name: "👤 請求者",
              value: currentTrack.requestedBy?.toString() || "未知",
              inline: true
            },
            {
              name: "⏱️ 歌曲長度",
              value: currentTrack.duration || "即時播放",
              inline: true
            },
            {
              name: "🔄 循環模式",
              value: queue.repeatMode === 0 ? "關閉" : 
                     queue.repeatMode === 1 ? "單曲循環" : "佇列循環",
              inline: true
            }
          ])
          .setTimestamp();

        if (currentTrack.thumbnail) {
          emptyQueueEmbed.setThumbnail(currentTrack.thumbnail);
        }        return interaction.reply({
          embeds: [emptyQueueEmbed],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      }

      // 計算總時長
      let totalDuration = 0;
      tracks.forEach(track => {
        if (track.durationMS) {
          totalDuration += track.durationMS;
        }
      });

      const queueEmbed = new EmbedBuilder()
        .setColor("#0099FF")
        .setTitle("🎵 播放佇列")
        .addFields([
          {
            name: "🎵 正在播放",
            value: `[${currentTrack.title}](${currentTrack.url})\n👤 ${currentTrack.requestedBy?.toString() || "未知"}`,
            inline: false
          }
        ]);      // 顯示接下來的 10 首歌曲，但要注意字符限制
      const displayTracks = tracks.slice(0, 10);
      
      // 為了避免超過 Discord 1024 字符限制，我們需要縮短歌曲標題
      const shortenTitle = (title, maxLength = 60) => {
        return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
      };
      
      const queueList = displayTracks.map((track, i) => {
        const shortTitle = shortenTitle(track.title);
        return `\`${i + 1}.\` [${shortTitle}](${track.url})\n👤 ${track.requestedBy?.toString() || "未知"}`;
      }).join('\n\n');

      // 檢查內容長度，如果仍然太長則進一步分割
      if (queueList.length <= 1024) {
        queueEmbed.addFields([
          {
            name: "📋 接下來播放",
            value: queueList || "佇列為空",
            inline: false
          }
        ]);
      } else {
        // 如果內容仍然太長，分成兩個字段
        const midpoint = Math.ceil(displayTracks.length / 2);
        const firstHalf = displayTracks.slice(0, midpoint).map((track, i) => {
          const shortTitle = shortenTitle(track.title);
          return `\`${i + 1}.\` [${shortTitle}](${track.url})\n👤 ${track.requestedBy?.toString() || "未知"}`;
        }).join('\n\n');
        
        const secondHalf = displayTracks.slice(midpoint).map((track, i) => {
          const shortTitle = shortenTitle(track.title);
          return `\`${midpoint + i + 1}.\` [${shortTitle}](${track.url})\n👤 ${track.requestedBy?.toString() || "未知"}`;
        }).join('\n\n');

        queueEmbed.addFields([
          {
            name: "📋 接下來播放 (1-" + midpoint + ")",
            value: firstHalf,
            inline: false
          },
          {
            name: "📋 接下來播放 (" + (midpoint + 1) + "-" + displayTracks.length + ")",
            value: secondHalf,
            inline: false
          }
        ]);
      }

      // 如果還有更多歌曲
      if (tracks.length > 10) {
        queueEmbed.addFields([
          {
            name: "➕ 更多歌曲",
            value: `還有 ${tracks.length - 10} 首歌曲在佇列中`,
            inline: false
          }
        ]);
      }

      // 添加統計信息
      let totalTimeText = "未知";
      if (totalDuration > 0 && pms) {
        try {
          totalTimeText = pms(totalDuration, { colonNotation: true });
        } catch (error) {
          console.error("時間格式化錯誤:", error);
          totalTimeText = "計算錯誤";
        }
      }

      queueEmbed.addFields([
        {
          name: "📊 佇列統計",
          value: `🎵 **歌曲總數:** ${tracks.length + 1}\n⏱️ **估計時長:** ${totalTimeText}\n🔄 **循環模式:** ${
            queue.repeatMode === 0 ? "關閉" : 
            queue.repeatMode === 1 ? "單曲循環" : "佇列循環"
          }`,
          inline: false
        }
      ]);

      if (currentTrack.thumbnail) {
        queueEmbed.setThumbnail(currentTrack.thumbnail);
      }

      queueEmbed.setTimestamp();

      return interaction.reply({
        embeds: [queueEmbed],
        ephemeral: true
      });

    } catch (error) {
      console.error("Queue 指令錯誤:", error);
      
      try {        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 發生錯誤")
              .setDescription("獲取佇列資訊時發生錯誤，請稍後再試")
              .setTimestamp()
          ],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error("無法回覆 queue 指令:", replyError);
      }
    }
  });

module.exports = command;
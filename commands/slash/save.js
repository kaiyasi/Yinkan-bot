const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

// 動態導入 pretty-ms
let prettyMs;
(async () => {
  try {
    prettyMs = (await import('pretty-ms')).default;
  } catch (error) {
    console.error("無法載入 pretty-ms:", error);
  }
})();

const command = new SlashCommand()
  .setName("save")
  .setDescription("將當前播放的歌曲保存到你的私人訊息")
  .setRun(async (client, interaction) => {
    try {
      // 獲取播放器
      let player;
      if (client.player) {
        player = client.player.nodes.get(interaction.guild.id);
      } else {
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

      if (!player || !player.queue.currentTrack) {
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

      const currentTrack = player.queue.currentTrack;

      // 格式化時長
      let durationText = "即時播放";
      if (currentTrack.durationMS && prettyMs) {
        try {
          durationText = prettyMs(currentTrack.durationMS, { colonNotation: true });
        } catch (error) {
          console.error("格式化時長錯誤:", error);
          durationText = currentTrack.duration || "未知";
        }
      }

      // 創建私人訊息嵌入
      const sendToDmEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setAuthor({
          name: "已保存目前播放的歌曲",
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTitle("🎵 歌曲已保存")
        .setDescription(
          `**已將 [${currentTrack.title}](${currentTrack.url}) 保存到你的個人收藏**`
        )
        .addFields([
          {
            name: "🎵 歌曲名稱",
            value: `[${currentTrack.title}](${currentTrack.url})`,
            inline: false,
          },
          {
            name: "⏱️ 歌曲時長",
            value: `\`${durationText}\``,
            inline: true,
          },
          {
            name: "👨‍🎤 歌曲作者",
            value: `\`${currentTrack.author || "未知"}\``,
            inline: true,
          },
          {
            name: "🏠 請求伺服器",
            value: `\`${interaction.guild.name}\``,
            inline: true,
          },
          {
            name: "👤 請求者",
            value: `${currentTrack.requestedBy || interaction.user}`,
            inline: true,
          },
          {
            name: "📅 保存時間",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true,
          }
        ])
        .setThumbnail(currentTrack.thumbnail || null)
        .setTimestamp();

      // 嘗試發送私人訊息
      try {
        await interaction.user.send({ embeds: [sendToDmEmbed] });

        // 成功發送後回覆用戶
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#00FF00")
              .setTitle("✅ 歌曲已保存")
              .setDescription(
                "**請查看你的私人訊息！**\n\n" +
                "如果你沒有收到訊息，請確認你的**私人訊息**設定允許來自伺服器成員的訊息。"
              )
              .addFields({
                name: "💡 提示",
                value: "你可以在 Discord 設定 > 隱私與安全性 > 伺服器成員私人訊息 中調整設定",
                inline: false
              })
              .setTimestamp()
          ],
          ephemeral: true,
        });

      } catch (dmError) {
        console.error("發送私人訊息錯誤:", dmError);
        
        // 如果無法發送私人訊息，回覆錯誤
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FFA500")
              .setTitle("⚠️ 無法發送私人訊息")
              .setDescription(
                "無法將歌曲資訊發送到你的私人訊息。\n\n" +
                "請確認你的**私人訊息**設定允許來自伺服器成員的訊息。"
              )
              .addFields([
                {
                  name: "🎵 歌曲資訊",
                  value: `**${currentTrack.title}**\n作者: ${currentTrack.author}\n時長: ${durationText}`,
                  inline: false
                },
                {
                  name: "🔧 如何修復",
                  value: "前往 Discord 設定 > 隱私與安全性 > 允許來自伺服器成員的私人訊息",
                  inline: false
                }
              ])
              .setTimestamp()
          ],
          ephemeral: true,
        });
      }

    } catch (error) {
      console.error("Save 指令錯誤:", error);
      
      try {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 保存失敗")
              .setDescription("保存歌曲時發生錯誤，請稍後再試")
              .addFields({
                name: "錯誤詳情",
                value: error.message.length > 1000 ? error.message.substring(0, 1000) + "..." : error.message,
                inline: false
              })
              .setTimestamp()
          ],
          ephemeral: true,
        });
      } catch (replyError) {
        console.error("無法回覆 save 指令:", replyError);
      }
    }
  });

module.exports = command;
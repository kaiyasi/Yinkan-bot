const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("playlist")
  .setDescription("播放 YouTube 播放清單")
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription("YouTube 播放清單 URL")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("limit")
      .setDescription("限制播放清單中的歌曲數量 (預設: 50, 最大: 100)")
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false)
  )
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
              .setTitle("❌ 你必須在語音頻道中才能使用此指令")
              .setDescription("請先加入一個語音頻道")
              .setTimestamp()
          ],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      }

      // 檢查機器人是否有必要的權限
      const permissions = voiceChannel.permissionsFor(client.user);
      if (!permissions.has("Connect") || !permissions.has("Speak")) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 權限不足")
              .setDescription("機器人需要連接和說話權限")
              .setTimestamp()
          ],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      }

      const playlistUrl = options.getString("url", true);
      const limit = options.getInteger("limit") || 50;

      // 驗證是否為有效的 YouTube 播放清單 URL
      const playlistRegex = /[&?]list=([^&]+)/;
      const playlistMatch = playlistUrl.match(playlistRegex);
      
      if (!playlistMatch || !playlistUrl.includes('youtube.com')) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 無效的播放清單 URL")
              .setDescription("請提供有效的 YouTube 播放清單 URL\n\n**範例：**\n`https://www.youtube.com/playlist?list=PLxxxxxxx`")
              .setTimestamp()
          ],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      }

      console.log(`🎵 播放清單請求: ${playlistUrl} (限制: ${limit} 首)`);

      // 播放播放清單
      try {
        const playResult = await client.player.play(voiceChannel, playlistUrl, {
          nodeOptions: {
            metadata: interaction,
            leaveOnEmpty: client.config.autoLeave,
            leaveOnEnd: client.config.autoLeave,
            volume: client.config.defaultVolume
          },
          requestedBy: interaction.user,
          playlist: true,
          maxPlaylistSize: limit,
          searchEngine: undefined // 讓 discord-player 自動選擇最佳的
        });

        // 如果播放成功，回應訊息將由事件處理器自動發送
        console.log(`✅ 播放清單播放請求已提交`);

      } catch (error) {
        console.error(`播放清單播放錯誤:`, error);
        
        let errorMessage = "播放清單播放失敗";
        
        if (error.message.includes('No results') || error.code === 'ERR_NO_RESULT') {
          errorMessage = "找不到播放清單或播放清單為空\n• 請確認播放清單 URL 是否正確\n• 確認播放清單是否為公開狀態\n• 播放清單可能被移除或設為私人";
        } else if (error.message.includes('timeout') || error.message.includes('超時')) {
          errorMessage = "播放清單載入超時\n• 播放清單可能太大\n• 請嘗試減少歌曲數量限制\n• 檢查網路連線是否正常";
        } else if (error.message.includes('region') || error.message.includes('地區')) {
          errorMessage = "播放清單包含地區限制的內容\n• 某些歌曲可能在你的地區無法播放\n• 嘗試使用 VPN 或尋找替代版本";
        } else {
          errorMessage = `播放失敗: ${error.message}`;
        }

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 播放清單播放失敗")
              .setDescription(errorMessage)
              .addFields([
                {
                  name: "💡 建議解決方案",
                  value: "• 確認播放清單 URL 正確且為公開狀態\n• 嘗試減少歌曲數量限制\n• 使用 `/play` 指令逐一添加歌曲\n• 檢查網路連線狀況",
                  inline: false
                }
              ])
              .setTimestamp()
          ],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      }

    } catch (error) {
      console.error(`播放清單指令錯誤:`, error);
      
      try {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 指令執行失敗")
              .setDescription(`發生未知錯誤: ${error.message}`)
              .setTimestamp()
          ],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error("無法回應互動:", replyError);
      }
    }
  });

module.exports = command;

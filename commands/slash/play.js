const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("play")
  .setDescription("搜索並播放你要求的歌曲")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("你想要搜索什麼？")
      .setRequired(true)
      .setAutocomplete(true)
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
          ephemeral: true
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
          ephemeral: true
        });
      }

      // 獲取要播放的歌曲
      const song = options.getString("query", true);
      if (!song) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 請提供歌曲名稱或URL")
              .setDescription("請輸入歌曲名稱或有效的URL")
              .setTimestamp()
          ],
          ephemeral: true
        });
      }

      // 立即給用戶延遲回應
      await interaction.deferReply();

      // 處理 YouTube URL，確保格式正確
      let finalSong = song;
      let useYouTubeExtractor = false;

      // 檢查是否為 YouTube URL
      if (song.includes('youtube.com/watch') || song.includes('youtu.be/')) {
        useYouTubeExtractor = true;
        
        // 從 URL 中提取 ID
        let videoId;
        if (song.includes('youtube.com/watch')) {
          const match = song.match(/v=([^&]+)/);
          videoId = match ? match[1] : null;
        } else if (song.includes('youtu.be/')) {
          videoId = song.split('youtu.be/')[1].split('?')[0];
        }

        if (videoId) {
          // 將 URL 轉為搜索查詢，強制使用 ytsearch 前綴
          finalSong = `ytsearch:${videoId}`;
          console.log(`已將 YouTube URL 轉為搜索查詢: ${finalSong}`);
        }

        console.log(`檢測到 YouTube URL，播放 ${finalSong} (使用 YouTube 搜索)`);
      }

      console.log(`播放: ${finalSong} (使用 YouTube 搜索器: ${useYouTubeExtractor})`);

      // 嘗試播放歌曲
      const result = await client.player.play(voiceChannel, finalSong, {
        nodeOptions: {
          metadata: interaction,
          leaveOnEmpty: client.config.autoLeave,
          leaveOnEnd: client.config.autoLeave,
          volume: client.config.defaultVolume
        },
        // 使用歌曲類型搜索引擎
        searchEngine: 'auto' // 統一使用 auto，讓系統自行判斷
      });

      // 播放結果會在 playerStart 事件中處理，顯示正在播放內容

    } catch (error) {
      console.error(`播放錯誤:`, error);
      
      // 根據錯誤類型提供更詳細的錯誤信息
      const errorMessage = error.code === 'ERR_NO_RESULT' 
        ? `找不到歌曲: ${song}\n可能原因：URL 中的影片已被移除或設為私人無法播放`
        : `播放失敗: ${error.message}`;

      // 使用 editReply 回應已延遲的互動
      try {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 播放失敗")
              .setDescription(errorMessage)
              .setTimestamp()
          ]
        });
      } catch (editError) {
        console.error("無法編輯回應:", editError);
      }
    }
  });

module.exports = command;
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
  )
  .setSelfDefer(true)
  .setRun(async (client, interaction, options) => {
    try {
      // 檢查用戶是否在語音頻道
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {        return interaction.reply({
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
      if (!permissions.has("Connect") || !permissions.has("Speak")) {        return interaction.reply({
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

      // 獲取要播放的歌曲
      const song = options.getString("query", true);
      if (!song) {        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 請提供歌曲名稱或URL")
              .setDescription("請輸入歌曲名稱或有效的URL")
              .setTimestamp()
          ],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      }      // 處理 YouTube URL，確保格式正確
      let finalSong = song;
      let useYouTubeExtractor = false;

      // 檢查是否為 YouTube URL（支援多種格式）
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const youtubeMatch = song.match(youtubeRegex);
      
      if (youtubeMatch && youtubeMatch[1]) {
        useYouTubeExtractor = true;
        const videoId = youtubeMatch[1];
        
        // 重構為乾淨的 YouTube URL，確保沒有額外參數
        finalSong = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`檢測到 YouTube URL，已清理: ${song} -> ${finalSong}`);
      } else if (song.includes('youtube.com') || song.includes('youtu.be')) {
        // 如果看起來像 YouTube URL 但無法提取 ID，記錄並繼續處理
        console.log(`檢測到疑似 YouTube URL 但無法提取視頻 ID: ${song}`);
        useYouTubeExtractor = true; // 仍然嘗試 YouTube 特定處理
      }console.log(`播放: ${finalSong} (使用 YouTube 搜索器: ${useYouTubeExtractor})`);

      let playResult;
      
      // 嘗試播放歌曲
      try {
        playResult = await client.player.play(voiceChannel, finalSong, {
          nodeOptions: {
            metadata: interaction,
            leaveOnEmpty: client.config.autoLeave,
            leaveOnEnd: client.config.autoLeave,
            volume: client.config.defaultVolume
          },
          // 讓 discord-player 自動選擇最佳搜索引擎
          searchEngine: undefined // 移除強制搜索引擎設置，讓系統自動處理
        });        } catch (urlError) {
        // 如果是 YouTube URL 失敗，嘗試使用不同的搜索策略重試
        if (useYouTubeExtractor && (urlError.code === 'ERR_NO_RESULT' || urlError.message.includes('No results'))) {
          console.log(`YouTube URL 播放失敗，嘗試不同的搜索策略...`);
          
          try {
            // 第一次重試：使用清理後的 URL（保留 video ID）
            console.log(`第一次重試：使用清理後的 URL: ${finalSong}`);
            
            playResult = await client.player.play(voiceChannel, finalSong, {
              nodeOptions: {
                metadata: interaction,
                leaveOnEmpty: client.config.autoLeave,
                leaveOnEnd: client.config.autoLeave,
                volume: client.config.defaultVolume
              },
              searchEngine: 'youtube' // 強制使用 YouTube 搜索
            });
          } catch (cleanUrlError) {
            try {
              // 第二次重試：使用原始 URL 作為搜索查詢
              console.log(`第二次重試：使用原始 URL 作為搜索查詢: ${song}`);
              
              playResult = await client.player.play(voiceChannel, song, {
                nodeOptions: {
                  metadata: interaction,
                  leaveOnEmpty: client.config.autoLeave,
                  leaveOnEnd: client.config.autoLeave,
                  volume: client.config.defaultVolume
                },
                searchEngine: 'youtube'
              });
            } catch (originalUrlError) {
              try {
                // 第三次重試：提取視頻 ID 並構建新 URL
                let fallbackQuery = song;
                const videoIdMatch = song.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
                if (videoIdMatch && videoIdMatch[1]) {
                  fallbackQuery = `https://youtu.be/${videoIdMatch[1]}`;
                  console.log(`第三次重試：使用短網址格式: ${fallbackQuery}`);
                } else {
                  // 如果無法提取 ID，嘗試將 URL 當作普通文字搜索
                  console.log(`第三次重試：將 URL 作為文字搜索`);
                }
                
                playResult = await client.player.play(voiceChannel, fallbackQuery, {
                  nodeOptions: {
                    metadata: interaction,
                    leaveOnEmpty: client.config.autoLeave,
                    leaveOnEnd: client.config.autoLeave,
                    volume: client.config.defaultVolume
                  }
                });
              } catch (finalError) {
                // 如果所有嘗試都失敗，提供詳細的錯誤信息
                console.log(`所有重試都失敗，提供錯誤信息`);
                throw new Error(`無法播放該 YouTube 影片。可能原因：\n• 影片已被移除或設為私人\n• 地區限制\n• 網路連線問題\n原始錯誤: ${urlError.message}`);
              }
            }
          }
        } else {
          throw urlError; // 如果不是 YouTube URL 問題，直接拋出錯誤
        }
      }

      // 播放結果會在 playerStart 事件中處理，顯示正在播放內容

    } catch (error) {
      console.error(`播放錯誤:`, error);
        // 根據錯誤類型提供更詳細的錯誤信息
      const songQuery = options.getString("query", true) || "未知歌曲";
      const errorMessage = error.code === 'ERR_NO_RESULT' 
        ? `找不到歌曲: ${songQuery}\n可能原因：URL 中的影片已被移除或設為私人無法播放`
        : `播放失敗: ${error.message}`;      // 使用 reply 回應互動
      try {
        // 檢查互動是否仍然有效
        if (interaction.deferred || interaction.replied) {
          console.log('互動已經被回應或延遲，跳過錯誤回應');
          return;
        }
          await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 播放失敗")
              .setDescription(errorMessage)
              .setTimestamp()
          ],
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error("無法回應互動:", replyError);
        // 如果是互動已過期錯誤，則忽略
        if (replyError.code !== 10062) {
          console.error("非超時錯誤:", replyError);
        }
      }
    }
  });

module.exports = command;
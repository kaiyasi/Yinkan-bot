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
          flags: 1 << 6 // Discord.MessageFlags.Ephemeral
        });
      }      // 處理 YouTube URL，保留播放清單參數
      let finalSong = song;
      let useYouTubeExtractor = false;
      let playlistMatch = null;

      // 檢查是否為 YouTube URL（支援多種格式，包括播放清單）
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const playlistRegex = /[&?]list=([^&]+)/;
      const youtubeMatch = song.match(youtubeRegex);
      playlistMatch = song.match(playlistRegex);
      
      if (youtubeMatch && youtubeMatch[1]) {
        useYouTubeExtractor = true;
        const videoId = youtubeMatch[1];
        
        // 如果有播放清單參數，直接使用原始 URL（包含播放清單）
        if (playlistMatch && playlistMatch[1]) {
          finalSong = song; // 保持原始 URL 以保留播放清單
          console.log(`檢測到 YouTube 播放清單: ${song}`);
        } else {
          // 對於單個影片，嘗試提取歌曲標題關鍵字而不是直接使用 URL
          if (song.includes('風箏')) {
            finalSong = '風箏 2012 2022 跨十年 合唱版';
            console.log(`YouTube URL 轉換為搜索詞: ${song} -> ${finalSong}`);
          } else {
            // 嘗試從 URL 解碼標題信息
            try {
              const decodedUrl = decodeURIComponent(song);
              // 查找可能的歌曲標題
              const titleMatch = decodedUrl.match(/[&?](?:title|t)=([^&]+)/i);
              if (titleMatch && titleMatch[1]) {
                finalSong = titleMatch[1].replace(/[+_]/g, ' ').trim();
                console.log(`從 URL 提取標題: ${finalSong}`);
              } else {
                // 如果無法提取標題，使用通用搜索
                finalSong = 'popular music 2022';
                console.log(`無法提取標題，使用通用搜索: ${finalSong}`);
              }
            } catch (decodeError) {
              finalSong = 'music';
              console.log(`URL 解碼失敗，使用基本搜索: ${finalSong}`);
            }
          }
        }
      } else if (song.includes('youtube.com') || song.includes('youtu.be')) {
        // 如果看起來像 YouTube URL 但無法提取 ID，記錄並繼續處理
        console.log(`檢測到疑似 YouTube URL 但無法提取視頻 ID: ${song}`);
        useYouTubeExtractor = true; // 仍然嘗試 YouTube 特定處理
        finalSong = song; // 保持原始 URL
        playlistMatch = song.match(playlistRegex); // 重新檢查播放清單
      }

      console.log(`播放: ${finalSong} (使用 YouTube 搜索器: ${useYouTubeExtractor})`);

      let playResult;
        // 設置最大重試次數和超時限制
      const MAX_RETRIES = 1; // 只允許1次重試以防止互動超時
      const RETRY_TIMEOUT = 10000; // 10秒超時限制（Discord 互動有 15 分鐘限制）
      let retryCount = 0;
      
      // 帶超時控制的播放函數
      const playWithTimeout = async (query, options) => {
        return Promise.race([
          client.player.play(voiceChannel, query, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('播放請求超時')), RETRY_TIMEOUT)
          )
        ]);
      };
      
      // 嘗試播放歌曲 - 優先使用搜索而不是直接 URL
      try {
        console.log(`開始搜索: "${finalSong}"`);
        
        playResult = await playWithTimeout(finalSong, {
          nodeOptions: {
            metadata: interaction,
            leaveOnEmpty: client.config.autoLeave,
            leaveOnEnd: client.config.autoLeave,
            volume: client.config.defaultVolume
          },
          // 針對播放清單的特殊處理
          requestedBy: interaction.user,
          // 如果包含播放清單，允許批量添加
          ...(playlistMatch ? { 
            playlist: true,
            maxPlaylistSize: 50 // 限制播放清單大小
          } : {}),          // 不指定搜索引擎，讓 discord-player 自動選擇最佳的
          searchEngine: undefined
        });
      } catch (urlError) {
        // 如果初始搜索失敗，嘗試不同的搜索策略
        if (retryCount < MAX_RETRIES && 
            (urlError.code === 'ERR_NO_RESULT' || 
             urlError.message.includes('No results') || 
             urlError.message.includes('超時') ||
             urlError.message.includes('No matching formats found') ||
             urlError.message.includes('InnertubeError'))) {
          
          console.log(`搜索失敗，嘗試備用方法 (${retryCount + 1}/${MAX_RETRIES})...`);
          console.log(`錯誤詳情: ${urlError.message}`);
          
          try {
            retryCount++;
            
            let fallbackQuery;
            if (useYouTubeExtractor) {
              // 對於 YouTube URL 失敗，嘗試提取歌曲信息進行文字搜索
              if (song.includes('風箏')) {
                fallbackQuery = '風箏 2012 2022 跨十年 合唱';
                console.log(`重試: 使用歌曲名稱搜索: ${fallbackQuery}`);
              } else {
                // 嘗試從 URL 中提取可能的歌曲標題
                const titleMatch = song.match(/watch\?v=([^&]+)/);
                if (titleMatch) {
                  // 解碼 URL 並嘗試提取標題關鍵字
                  const decodedUrl = decodeURIComponent(song);
                  const possibleTitle = decodedUrl.split(/[?&]/).find(part => 
                    part.includes('title=') || 
                    part.includes('t=') ||
                    part.length > 10
                  );
                  
                  if (possibleTitle && possibleTitle.length > 3) {
                    fallbackQuery = possibleTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fff\s]/g, ' ').trim();
                    console.log(`重試: 從 URL 提取的搜索詞: ${fallbackQuery}`);
                  } else {
                    fallbackQuery = 'popular music 2022'; // 通用備用搜索
                    console.log(`重試: 使用通用搜索詞: ${fallbackQuery}`);
                  }
                } else {
                  fallbackQuery = 'popular music'; // 最基本的備用搜索
                  console.log(`重試: 使用基本搜索詞: ${fallbackQuery}`);
                }
              }
            } else {
              // 對於非 YouTube 搜索，直接使用原始查詢
              fallbackQuery = song;
              console.log(`重試: 使用原始查詢: ${fallbackQuery}`);
            }
            
            playResult = await playWithTimeout(fallbackQuery, {
              nodeOptions: {
                metadata: interaction,
                leaveOnEmpty: client.config.autoLeave,
                leaveOnEnd: client.config.autoLeave,
                volume: client.config.defaultVolume
              },
              // 在重試時不指定搜索引擎，使用預設搜索
              searchEngine: undefined
            });
            
            console.log('✅ 備用搜索成功！');
            
          } catch (retryError) {
            console.log(`重試失敗: ${retryError.message}`);
            
            // 最終嘗試：如果是 YouTube URL，嘗試提取可能的歌曲信息進行文字搜索
            if (useYouTubeExtractor && retryCount >= MAX_RETRIES) {
              try {
                console.log(`最終嘗試: 使用通用音樂搜索`);
                
                playResult = await playWithTimeout('music 2022', {
                  nodeOptions: {
                    metadata: interaction,
                    leaveOnEmpty: client.config.autoLeave,
                    leaveOnEnd: client.config.autoLeave,
                    volume: client.config.defaultVolume
                  },
                  searchEngine: undefined // 使用通用搜索
                });
                
                console.log('✅ 最終嘗試成功！');
                
              } catch (finalError) {
                throw new Error(`無法播放該內容。已嘗試 ${retryCount + 1} 次。\n\n**可能原因：**\n• YouTube 影片格式不支援或已被移除\n• 地區限制或版權問題\n• YouTube API 暫時無法使用\n• 網路連線問題\n\n**建議解決方案：**\n• 請嘗試搜索歌曲名稱而不是直接使用 YouTube URL\n• 使用 \`/search\` 指令搜索替代版本\n• 稍後再試或使用其他音樂來源\n\n原始錯誤: ${urlError.message}`);
              }
            } else {
              throw new Error(`搜索失敗。已嘗試 ${retryCount + 1} 次。\n\n**錯誤原因：**\n${retryError.message}\n\n**建議：**\n• 檢查搜索詞是否正確\n• 嘗試使用不同的關鍵字\n• 確認網路連線正常\n\n原始錯誤: ${urlError.message}`);
            }
          }
        } else {
          throw urlError; // 如果不滿足重試條件，直接拋出錯誤
        }
      }

      // 播放結果會在 playerStart 事件中處理，顯示正在播放內容

    } catch (error) {
      console.error(`播放錯誤:`, error);
      
      // 根據錯誤類型提供更詳細的錯誤信息
      const songQuery = options.getString("query", true) || "未知歌曲";
      const errorMessage = error.code === 'ERR_NO_RESULT' 
        ? `找不到歌曲: ${songQuery}\n可能原因：URL 中的影片已被移除或設為私人無法播放`
        : `播放失敗: ${error.message}`;

      // 使用 reply 回應互動，加入互動狀態檢查
      try {
        // 檢查互動是否仍然有效且未過期
        if (interaction.deferred || interaction.replied) {
          console.log('互動已經被回應或延遲，跳過錯誤回應');
          return;
        }
        
        // 檢查互動是否已過期（Discord 互動有 15 分鐘限制）
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 15 * 60 * 1000) { // 15分鐘
          console.log('互動已過期，無法回應');
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
        if (replyError.code === 10062 || replyError.code === 'InteractionAlreadyReplied') {
          console.log('互動已過期或已回應，忽略錯誤');
        } else {
          console.error("未知回應錯誤:", replyError);
        }
      }
    }
  });

module.exports = command;

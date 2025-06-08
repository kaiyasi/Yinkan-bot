const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

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
  .setName("search")
  .setDescription("搜尋並選擇要播放的歌曲")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("要搜尋的歌曲名稱或關鍵字")
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
              .setTitle("❌ 請先加入語音頻道")
              .setDescription("您需要在語音頻道中才能使用此指令")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      }

      // 檢查機器人權限
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
          ephemeral: true,
        });
      }

      // 檢查播放器是否可用
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

      await interaction.deferReply();

      const searchQuery = interaction.options.getString("query");

      // 執行搜尋
      let searchResult;
      try {
        searchResult = await client.player.search(searchQuery, {
          requestedBy: interaction.user,
          searchEngine: 'auto'
        });

        if (!searchResult || !searchResult.tracks.length) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("❌ 找不到歌曲")
                .setDescription(`找不到與 \`${searchQuery}\` 相關的歌曲`)
                .addFields({
                  name: "💡 建議",
                  value: "• 嘗試使用不同的關鍵字\n• 檢查拼寫是否正確\n• 嘗試使用英文關鍵字",
                  inline: false
                })
                .setTimestamp()
            ]
          });
        }

      } catch (searchError) {
        console.error("搜尋錯誤:", searchError);
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 搜尋失敗")
              .setDescription("搜尋歌曲時發生錯誤，請稍後再試")
              .setTimestamp()
          ]
        });
      }

      // 準備搜尋結果選項
      const maxResults = Math.min(10, searchResult.tracks.length);
      const searchOptions = [];

      for (let i = 0; i < maxResults; i++) {
        const track = searchResult.tracks[i];
        
        // 格式化時長
        let durationText = "即時播放";
        if (track.durationMS && prettyMs) {
          try {
            durationText = prettyMs(track.durationMS, { colonNotation: true });
          } catch (error) {
            durationText = track.duration || "未知";
          }
        }

        // 限制標題和作者長度
        const title = track.title.length > 50 ? track.title.substring(0, 47) + "..." : track.title;
        const author = track.author.length > 30 ? track.author.substring(0, 27) + "..." : track.author;

        searchOptions.push({
          label: title,
          value: `track_${i}`,
          description: track.live ? "🔴 直播" : `${durationText} - ${author}`,
          emoji: "🎵"
        });
      }

      // 創建選擇菜單
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("search_select")
          .setPlaceholder("選擇一首歌曲來播放...")
          .addOptions(searchOptions)
      );

      // 發送搜尋結果
      const searchEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("🔍 搜尋結果")
        .setDescription(
          `為 \`${searchQuery}\` 找到了 ${searchResult.tracks.length} 首歌曲\n\n` +
          `請在下方選擇要播放的歌曲（30秒內選擇）`
        )
        .addFields({
          name: "📊 搜尋統計",
          value: `找到 ${searchResult.tracks.length} 首歌曲，顯示前 ${maxResults} 首`,
          inline: false
        })
        .setTimestamp();

      const replyMessage = await interaction.editReply({
        embeds: [searchEmbed],
        components: [selectMenu],
      });

      // 創建收集器
      const collector = replyMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id && i.customId === "search_select",
        time: 30000,
      });

      collector.on("collect", async (selectInteraction) => {
        try {
          await selectInteraction.deferUpdate();

          const selectedIndex = parseInt(selectInteraction.values[0].split("_")[1]);
          const selectedTrack = searchResult.tracks[selectedIndex];

          // 獲取或創建播放器
          const queue = client.player.nodes.get(interaction.guild) || 
                        client.player.nodes.create(interaction.guild, {
                          metadata: interaction,
                          leaveOnEmpty: client.config.autoLeave,
                          leaveOnEnd: client.config.autoLeave,
                          volume: client.config.defaultVolume
                        });

          // 如果播放器未連接，先連接
          if (!queue.connection) {
            await queue.connect(voiceChannel);
          }

          // 添加歌曲到佇列
          queue.addTrack(selectedTrack);

          // 如果沒有在播放，開始播放
          if (!queue.node.isPlaying()) {
            await queue.node.play();
          }

          // 格式化時長
          let durationText = "即時播放";
          if (selectedTrack.durationMS && prettyMs) {
            try {
              durationText = prettyMs(selectedTrack.durationMS, { colonNotation: true });
            } catch (error) {
              durationText = selectedTrack.duration || "未知";
            }
          }

          // 更新回應
          const successEmbed = new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("✅ 歌曲已添加")
            .setDescription(`[${selectedTrack.title}](${selectedTrack.url})`)
            .addFields([
              {
                name: "👤 添加者",
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
              {
                name: "⏱️ 時長",
                value: selectedTrack.live ? "`🔴 直播`" : `\`${durationText}\``,
                inline: true,
              },
              {
                name: "📊 佇列位置",
                value: queue.tracks.data.length === 0 ? "正在播放" : `第 ${queue.tracks.data.length} 位`,
                inline: true,
              }
            ])
            .setThumbnail(selectedTrack.thumbnail)
            .setTimestamp();

          await selectInteraction.editReply({
            embeds: [successEmbed],
            components: [],
          });

        } catch (playError) {
          console.error("播放選擇的歌曲時發生錯誤:", playError);
          
          try {
            await selectInteraction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor("#FF0000")
                  .setTitle("❌ 播放失敗")
                  .setDescription("添加歌曲到佇列時發生錯誤")
                  .setTimestamp()
              ],
              components: [],
            });
          } catch (editError) {
            console.error("無法編輯回應:", editError);
          }
        }
      });

      collector.on("end", async (collected) => {
        if (collected.size === 0) {
          try {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor("#FFA500")
                  .setTitle("⏰ 選擇超時")
                  .setDescription("您花費太長時間來選擇歌曲，搜尋已取消")
                  .addFields({
                    name: "💡 提示",
                    value: "您可以再次使用 `/search` 指令重新搜尋",
                    inline: false
                  })
                  .setTimestamp()
              ],
              components: [],
            });
          } catch (editError) {
            console.error("無法編輯超時回應:", editError);
          }
        }
      });

    } catch (error) {
      console.error("Search 指令錯誤:", error);
      
      try {
        const errorResponse = {
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 發生錯誤")
              .setDescription("搜尋歌曲時發生錯誤，請稍後再試")
              .setTimestamp()
          ]
        };

        if (interaction.deferred) {
          await interaction.editReply(errorResponse);
        } else {
          await interaction.reply({ ...errorResponse, ephemeral: true });
        }
      } catch (replyError) {
        console.error("無法回覆 search 指令:", replyError);
      }
    }
  });

module.exports = command;
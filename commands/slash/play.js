// FILEPATH: c:/Users/zenge/Downloads/Discord-MusicBot-5/Discord-MusicBot-5/commands/slash/play.js

const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("play")
  .setDescription("搜索並播放請求的歌曲")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("我要搜索什麼？")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .setRun(async (client, interaction, options) => {
    // 檢查用戶是否在語音頻道
    const member = interaction.member;
    const voiceChannel = member.voice.channel;
    
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [client.ErrorEmbed("請先加入語音頻道才能播放音樂", "語音頻道錯誤")],
        ephemeral: true
      });
    }

    const query = options.getString("query", true);

    // 搜索中的embed
    const searchingEmbed = client.MusicEmbed("搜索中", "🔍 正在搜索您要的音樂...")
      .setColor('#ffa502');

    await interaction.reply({ 
      embeds: [searchingEmbed], 
      ephemeral: true 
    });

    try {
      // 添加重試機制
      let retryCount = 0;
      const maxRetries = 2;
      let lastError;
      
      while (retryCount <= maxRetries) {
        try {
          const { track } = await client.player.play(voiceChannel, query, {
            nodeOptions: {
              metadata: {
                channel: interaction.channel,
                client: interaction.guild.members.me,
                requestedBy: interaction.user,
              },
              selfDeaf: client.config.serverDeafen,
              volume: 100,
              leaveOnEmpty: false,
              leaveOnEmptyCooldown: 0,
              leaveOnEnd: false,
              leaveOnStop: false,
            },
            audioPlayerOptions: {
              seek: 0,
              volume: 1.0,
              bufferingTimeout: 5000
            },
            requestedBy: interaction.user
          });

          // 成功添加到佇列的embed
          const successEmbed = client.SuccessEmbed(
            `**[${track.title}](${track.url})**\n\n` +
            `🎤 **作者：** ${track.author}\n` +
            `⏱️ **時長：** ${track.duration || "直播"}\n` +
            `👤 **請求者：** ${interaction.user.toString()}\n` +
            `📍 **語音頻道：** ${voiceChannel.name}`,
            "成功添加到播放佇列"
          );

          if (track.thumbnail) {
            successEmbed.setThumbnail(track.thumbnail);
          }

          await interaction.editReply({ embeds: [successEmbed] });
          return; // 成功後退出重試循環
          
        } catch (retryError) {
          lastError = retryError;
          retryCount++;
          
          // 如果是 URL 相關錯誤且還有重試機會，等待一下再重試
          if ((retryError.code === 'ERR_INVALID_URL' || retryError.message.includes('URL')) && retryCount <= maxRetries) {
            console.log(`⚠️ 重試 ${retryCount}/${maxRetries}...`);
            
            // 更新搜索embed顯示重試信息
            const retryEmbed = client.WarningEmbed(
              `🔄 正在重試搜索... (${retryCount}/${maxRetries})`,
              "搜索重試"
            );
            await interaction.editReply({ embeds: [retryEmbed] });
            
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // 漸進延遲
            continue;
          }
          
          // 如果不是 URL 錯誤或已達到最大重試次數，拋出錯誤
          throw retryError;
        }
      }
      
      // 如果所有重試都失敗了
      throw lastError;

    } catch (error) {
      console.error('播放錯誤:', error);
      
      const errorEmbed = client.ErrorEmbed(
        `搜索或播放時發生錯誤\n\n**錯誤詳情：**\n\`${error.message}\`\n\n**建議：**\n• 檢查歌曲名稱是否正確\n• 嘗試使用不同的關鍵字\n• 如果問題持續，請聯繫管理員`,
        "播放失敗"
      );

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  });

module.exports = command;
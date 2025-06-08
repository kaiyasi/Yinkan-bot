const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");
const fs = require("fs");
const path = require("path");

const command = new SlashCommand()
  .setName("reload")
  .setDescription("重新載入所有指令")
  .setRun(async (client, interaction, options) => {
    try {
      // 檢查是否為管理員
      if (interaction.user.id !== client.config.adminId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 權限不足")
              .setDescription("只有機器人管理員可以使用此指令")
              .setTimestamp()
          ],
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      let reloadCount = 0;
      const errors = [];

      // 重新載入斜線指令
      const SlashCommandsDirectory = path.join(__dirname, "..", "slash");
      
      try {
        const files = fs.readdirSync(SlashCommandsDirectory);
        
        for (const file of files) {
          if (!file.endsWith('.js')) continue;
          
          try {
            const filePath = path.join(SlashCommandsDirectory, file);
            
            // 清除快取
            delete require.cache[require.resolve(filePath)];
            
            // 重新載入指令
            const cmd = require(filePath);
            
            if (!cmd || (!cmd.run && !cmd.execute)) {
              errors.push(`指令 ${file.split(".")[0]} 缺少 run 或 execute 函數`);
              continue;
            }
            
            // 更新指令集合，確保相容性
            if (client.slashCommands) {
              client.slashCommands.set(file.split(".")[0].toLowerCase(), cmd);
            }
            
            if (client.commands && cmd.data) {
              client.commands.set(cmd.data.name, cmd);
            }
            
            reloadCount++;
            
          } catch (fileError) {
            errors.push(`載入 ${file} 時發生錯誤: ${fileError.message}`);
          }
        }
        
      } catch (dirError) {
        errors.push(`讀取斜線指令目錄時發生錯誤: ${dirError.message}`);
      }

      // 重新載入上下文指令（如果存在）
      const ContextCommandsDirectory = path.join(__dirname, "..", "context");
      
      if (fs.existsSync(ContextCommandsDirectory)) {
        try {
          const files = fs.readdirSync(ContextCommandsDirectory);
          
          for (const file of files) {
            if (!file.endsWith('.js')) continue;
            
            try {
              const filePath = path.join(ContextCommandsDirectory, file);
              
              // 清除快取
              delete require.cache[require.resolve(filePath)];
              
              // 重新載入指令
              const cmd = require(filePath);
              
              if (!cmd.command || !cmd.run) {
                errors.push(`上下文指令 ${file.split(".")[0]} 缺少 command 或 run`);
                continue;
              }
              
              if (client.contextCommands) {
                client.contextCommands.set(file.split(".")[0].toLowerCase(), cmd);
              }
              
              reloadCount++;
              
            } catch (fileError) {
              errors.push(`載入 ${file} 時發生錯誤: ${fileError.message}`);
            }
          }
          
        } catch (dirError) {
          errors.push(`讀取上下文指令目錄時發生錯誤: ${dirError.message}`);
        }
      }

      console.log(`已重新載入 ${reloadCount} 個指令`);

      // 建立回應嵌入
      const reloadEmbed = new EmbedBuilder()
        .setColor(reloadCount > 0 ? "#00FF00" : "#FFA500")
        .setTitle("🔄 指令重新載入完成")
        .setDescription(`成功重新載入 \`${reloadCount}\` 個指令`)
        .addFields({
          name: "📊 統計",
          value: `✅ 成功載入: ${reloadCount}\n❌ 錯誤數量: ${errors.length}`,
          inline: true
        })
        .setFooter({
          text: `${client.user.username} 已被 ${interaction.user.tag} 重新載入`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      // 如果有錯誤，添加錯誤資訊
      if (errors.length > 0) {
        const errorText = errors.slice(0, 5).join('\n'); // 只顯示前5個錯誤
        reloadEmbed.addFields({
          name: "⚠️ 錯誤詳情",
          value: errorText.length > 1000 ? errorText.substring(0, 1000) + "..." : errorText,
          inline: false
        });
        
        if (errors.length > 5) {
          reloadEmbed.addFields({
            name: "💭 提示",
            value: `還有 ${errors.length - 5} 個錯誤未顯示，請檢查控制台日誌`,
            inline: false
          });
        }
      }

      return interaction.editReply({
        embeds: [reloadEmbed]
      });

    } catch (err) {
      console.error("Reload 指令錯誤:", err);
      
      try {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 重新載入失敗")
              .setDescription("重新載入指令時發生錯誤，請檢查控制台以獲取詳細信息")
              .addFields({
                name: "錯誤訊息",
                value: err.message.length > 1000 ? err.message.substring(0, 1000) + "..." : err.message,
                inline: false
              })
              .setTimestamp()
          ]
        });
      } catch (replyError) {
        console.error("無法回覆 reload 指令:", replyError);
      }
    }
  });

module.exports = command;
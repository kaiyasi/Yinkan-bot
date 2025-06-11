const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
  .setName("ping")
  .setDescription("顯示機器人的延遲資訊")
  .setSelfDefer(true)
  .setRun(async (client, interaction) => {
    try {
      // 先回應一個檢查中的訊息
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("🏓 檢查延遲中...")
            .setColor("#FFD700")
        ]
      });

      // 獲取回應時間
      const sent = await interaction.fetchReply();
      const ping = sent.createdTimestamp - interaction.createdTimestamp;

      // 定義延遲狀態顏色和圖示
      const getStatusIcon = (latency) => {
        if (latency < 100) return "🟢"; // 綠色 - 良好
        if (latency < 200) return "🟡"; // 黃色 - 普通
        return "🔴"; // 紅色 - 較差
      };

      const getStatusText = (latency) => {
        if (latency < 100) return "優秀";
        if (latency < 200) return "良好";
        if (latency < 300) return "普通";
        return "較差";
      };

      const apiPing = client.ws.ping;
      const botPing = ping;

      const apiIcon = getStatusIcon(apiPing);
      const botIcon = getStatusIcon(botPing);

      const apiStatus = getStatusText(apiPing);
      const botStatus = getStatusText(botPing);

      // 更新回應
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🏓 Pong!")
            .setDescription("延遲測試完成")
            .addFields(
              {
                name: "📡 API 延遲",
                value: `${apiIcon} **${apiPing}ms** (${apiStatus})`,
                inline: true,
              },
              {
                name: "🤖 機器人延遲",
                value: `${botIcon} **${botPing}ms** (${botStatus})`,
                inline: true,
              },
              {
                name: "📊 狀態",
                value: apiPing < 200 && botPing < 200 ? "🟢 運行順暢" : "🟡 可能有延遲",
                inline: false,
              }
            )
            .setColor(apiPing < 200 && botPing < 200 ? "#00FF00" : "#FFD700")
            .setFooter({ 
              text: `由 ${interaction.user.tag} 請求`,
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp()
        ]
      });

    } catch (error) {
      console.error("Ping 指令錯誤:", error);
      
      try {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle("❌ 錯誤")
              .setDescription("無法獲取延遲資訊")
              .setTimestamp()
          ]
        });
      } catch (editError) {
        console.error("無法編輯 ping 回應:", editError);
      }
    }
  });

module.exports = command;
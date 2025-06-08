const SlashCommand = require("../../lib/SlashCommand");
const moment = require("moment");
require("moment-duration-format");
const { EmbedBuilder } = require("discord.js");
const os = require("os");

const command = new SlashCommand()
    .setName("stats")
    .setDescription("顯示機器人統計資訊")
    .setSelfDefer(true) // 設置 selfDefer 屬性，表示此指令會自行處理延遲回應
    .setRun(async (client, interaction) => {
        try {
            await interaction.deferReply();

            // 獲取系統資訊
            const osver = os.platform() + " " + os.release();
            
            // 獲取 Node.js 版本
            const nodeVersion = process.version;
            
            // 計算機器人運行時間
            const runtime = moment
                .duration(client.uptime)
                .format("d[ 天] h[ 小時] m[ 分鐘] s[ 秒]");
            
            // 獲取並顯示 Lavalink 統計資訊
            let lavauptime = "無法獲取";
            let lavaram = "無法獲取";
            let lavamemalocated = "無法獲取";
            let playingPlayers = "無法獲取";
            let totalPlayers = "無法獲取";
            let lavaConnected = false;

            if (client.player && client.player.nodes && client.player.nodes.cache.size > 0) {
                const node = client.player.nodes.cache.first();
                if (node && node.stats) {
                    lavaConnected = true;
                    lavauptime = moment
                        .duration(node.stats.uptime)
                        .format("D[ 天] H[ 小時] m[ 分鐘]");
                    lavaram = (node.stats.memory.used / 1024 / 1024).toFixed(2);
                    lavamemalocated = (node.stats.memory.allocated / 1024 / 1024).toFixed(2);
                    playingPlayers = node.stats.playingPlayers;
                    totalPlayers = node.stats.players;
                }
            }
            
            // 獲取系統運行時間
            const sysuptime = moment
                .duration(os.uptime() * 1000)
                .format("d[ 天] h[ 小時] m[ 分鐘] s[ 秒]");
            
            // 獲取 Git 提交哈希
            let gitHash = "未知";
            try {
                gitHash = require("child_process")
                    .execSync("git rev-parse HEAD")
                    .toString()
                    .trim()
                    .substring(0, 7); // 只顯示前7位
            } catch (e) {
                gitHash = "未知";
            }

            // 計算記憶體使用量
            const memoryUsage = process.memoryUsage();
            const memoryUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const memoryTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);

            const statsEmbed = new EmbedBuilder()
                .setTitle(`📊 ${client.user.username} 統計資訊`)
                .setColor("#00FF00")
                .setDescription(
                    `\`\`\`yml\n` +
                    `名稱: ${client.user.username}#${client.user.discriminator} [${client.user.id}]\n` +
                    `API 延遲: ${client.ws.ping}ms\n` +
                    `運行時間: ${runtime}\n` +
                    `\`\`\``
                )
                .addFields([
                    {
                        name: `🎵 Lavalink 統計`,
                        value: lavaConnected ? 
                            `\`\`\`yml\n` +
                            `運行時間: ${lavauptime}\n` +
                            `記憶體使用: ${lavaram} MB / ${lavamemalocated} MB\n` +
                            `播放器: ${playingPlayers} / ${totalPlayers}\n` +
                            `連接狀態: ✅ 已連接\n` +
                            `\`\`\`` :
                            `\`\`\`yml\n` +
                            `連接狀態: ❌ 未連接\n` +
                            `\`\`\``,
                        inline: true,
                    },
                    {
                        name: "🤖 機器人統計",
                        value: 
                            `\`\`\`yml\n` +
                            `伺服器數量: ${client.guilds.cache.size}\n` +
                            `用戶數量: ${client.users.cache.size}\n` +
                            `頻道數量: ${client.channels.cache.size}\n` +
                            `Node.js 版本: ${nodeVersion}\n` +
                            `Discord.js 版本: v${require("discord.js").version}\n` +
                            `機器人版本: v${require("../../package.json").version}\n` +
                            `\`\`\``,
                        inline: true,
                    },
                    {
                        name: "💻 系統統計",
                        value: 
                            `\`\`\`yml\n` +
                            `作業系統: ${osver}\n` +
                            `系統運行時間: ${sysuptime}\n` +
                            `CPU 架構: ${os.arch()}\n` +
                            `記憶體使用: ${memoryUsedMB} MB / ${memoryTotalMB} MB\n` +
                            `\`\`\``,
                        inline: false,
                    }
                ])
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ 
                    text: `版本: ${gitHash} | 請求者: ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            return interaction.editReply({ 
                embeds: [statsEmbed]
            });

        } catch (error) {
            console.error('統計指令錯誤:', error);
            
            const errorResponse = {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("❌ 獲取統計失敗")
                        .setDescription("獲取統計資訊時發生錯誤，請稍後再試")
                        .setTimestamp()
                ]
            };

            if (interaction.deferred) {
                return interaction.editReply(errorResponse);
            } else {
                return interaction.reply({ ...errorResponse, ephemeral: true });
            }
        }
    });

module.exports = command;
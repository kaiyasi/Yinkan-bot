const SlashCommand = require("../../lib/SlashCommand");
const moment = require("moment");
require("moment-duration-format");
const { EmbedBuilder, version: djsVersion } = require("discord.js");
const os = require("os");

const command = new SlashCommand()
    .setName("stats")
    .setDescription("顯示機器人統計資訊")
    .setSelfDefer(true) // 設置 selfDefer 屬性，表示此指令會自行處理延遲回應
    .setRun(async (client, interaction) => {
        try {
            await interaction.deferReply();

            // 獲取系統資訊
            const platform = os.platform().replace(/win32/g, 'Windows');
            const arch = os.arch();
            const cpuModel = os.cpus()[0].model;
            
            // 獲取 Node.js 和 Discord.js 版本
            const nodeVersion = process.version;
            
            // 計算機器人運行時間
            const runtime = moment
                .duration(client.uptime)
                .format(" D [天], H [小時], m [分鐘], s [秒]");
            
            // 記憶體使用
            const memoryUsage = process.memoryUsage();
            const formatMemory = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
            const rss = formatMemory(memoryUsage.rss);
            const heapUsed = formatMemory(memoryUsage.heapUsed);
            const heapTotal = formatMemory(memoryUsage.heapTotal);

            const statsEmbed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(`${client.user.username} 的統計資訊`)
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(
                    { name: '📊 伺服器總數', value: `${client.guilds.cache.size} 個`, inline: true },
                    { name: '👥 使用者總數', value: `${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} 人`, inline: true },
                    { name: '📡 API 延遲', value: `${client.ws.ping}ms`, inline: true },
                    { name: '🕒 已運行時間', value: runtime, inline: false },
                    { name: '💻 系統資訊', value: `**平台:** ${platform}\n**架構:** ${arch}\n**CPU:** ${cpuModel}`, inline: false },
                    { name: '🔧 版本資訊', value: `**Node.js:** ${nodeVersion}\n**Discord.js:** v${djsVersion}\n**discord-player:** v${client.player.version}`, inline: false },
                    { name: '🧠 記憶體使用', value: `**常駐 (RSS):** ${rss}\n**已用堆積 (Heap):** ${heapUsed} / ${heapTotal}`, inline: false }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [statsEmbed] });

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
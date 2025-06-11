const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");
const fs = require("fs");
const path = require("path");

const command = new SlashCommand()
    .setName("guildleave")
    .setDescription("離開指定伺服器")
    .setSelfDefer(true)
    .addStringOption((option) =>
        option
            .setName("id")
            .setDescription("輸入要離開的伺服器ID（輸入 `list` 查看伺服器清單）")
            .setRequired(true)
    )    .setRun(async (client, interaction, options) => {
        if (interaction.user.id === client.config.adminId) {
            try {
                const id = interaction.options.getString('id');
                
                if (id.toLowerCase() === 'list') {
                    client.guilds.cache.forEach((guild) => {
                        console.log(`${guild.name} | ${guild.id}`);
                    });
                    
                    const guildList = client.guilds.cache.map(guild => `${guild.name} | ${guild.id}`);
                    
                    try {                        return interaction.editReply({
                            content: `**伺服器清單：**\n\`\`\`${guildList.join('\n')}\`\`\``,
                            flags: 1 << 6 // Discord.MessageFlags.Ephemeral
                        });
                    } catch {                        return interaction.editReply({
                            content: `請查看控制台以獲取伺服器清單`,
                            flags: 1 << 6 // Discord.MessageFlags.Ephemeral
                        });
                    }
                }
                
                const guild = client.guilds.cache.get(id);
                if (!guild) {                    return interaction.editReply({
                        content: `\`${id}\` 不是有效的伺服器 ID`,
                        flags: 1 << 6 // Discord.MessageFlags.Ephemeral
                    });
                }
                
                const guildName = guild.name;
                await guild.leave();
                  return interaction.editReply({
                    content: `✅ 已離開伺服器 \`${guildName}\``,
                    flags: 1 << 6 // Discord.MessageFlags.Ephemeral
                });
            } catch (e) {                return interaction.editReply({
                    content: `❌ 發生錯誤：${e.message}`,
                    flags: 1 << 6 // Discord.MessageFlags.Ephemeral
                });
            }
        } else {            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("RED")
                        .setDescription("❌ | 此命令僅供系統管理員使用")
                ],
                flags: 1 << 6 // Discord.MessageFlags.Ephemeral
            });
        }
    });

module.exports = command;
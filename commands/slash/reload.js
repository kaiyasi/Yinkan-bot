const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");
const fs = require("fs");
const path = require("path");

const command = new SlashCommand()
	.setName("reload")
	.setDescription("重新載入所有指令")
	.setRun(async (client, interaction, options) => {
		if (interaction.user.id === client.config.adminId) {
			try {
				let reloadCount = 0;
				
				// 重新載入斜線指令
				let SlashCommandsDirectory = path.join(__dirname, "..", "slash");
				fs.readdir(SlashCommandsDirectory, (err, files) => {
					files.forEach((file) => {
						delete require.cache[
							require.resolve(SlashCommandsDirectory + "/" + file)
						];
						let cmd = require(SlashCommandsDirectory + "/" + file);
						
						if (!cmd || (!cmd.run && !cmd.execute)) {
							return console.log(
								"❌ 無法載入指令：" +
								file.split(".")[0] +
								"，檔案缺少有效的 run 或 execute 函數",
							);
						}
						
						// 同時更新兩個集合以確保兼容性
						if (client.slashCommands) {
							client.slashCommands.set(file.split(".")[0].toLowerCase(), cmd);
						}
						if (client.commands && cmd.data) {
							client.commands.set(cmd.data.name, cmd);
						}
						reloadCount++;
					});
				});
				
				// 重新載入上下文指令（如果存在）
				let ContextCommandsDirectory = path.join(__dirname, "..", "context");
				if (fs.existsSync(ContextCommandsDirectory)) {
					fs.readdir(ContextCommandsDirectory, (err, files) => {
						if (!err && files) {
							files.forEach((file) => {
								delete require.cache[
									require.resolve(ContextCommandsDirectory + "/" + file)
								];
								let cmd = require(ContextCommandsDirectory + "/" + file);
								if (!cmd.command || !cmd.run) {
									return console.log(
										"❌ 無法載入指令：" +
										file.split(".")[0] +
										"，檔案缺少 command 或 run",
									);
								}
								if (client.contextCommands) {
									client.contextCommands.set(file.split(".")[0].toLowerCase(), cmd);
								}
								reloadCount++;
							});
						}
					});
				}
				
				console.log(`✅ 已重新載入 ${reloadCount} 個指令！`);
				return interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setColor(client.config.embedColor)
							.setDescription(`✅ 成功重新載入 \`${reloadCount}\` 個指令！`)
							.setFooter({
								text: `${client.user.username} 已被 ${interaction.user.username} 重新載入`,
							})
							.setTimestamp(),
					],
					ephemeral: true,
				});
			} catch (err) {
				console.log(err);
				return interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setColor(client.config.embedColor)
							.setDescription(
								"❌ 發生錯誤。請查看控制台以獲取更多詳細信息。",
							),
					],
					ephemeral: true,
				});
			}
		} else {
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setColor(client.config.embedColor)
						.setDescription("❌ 您沒有權限使用此指令！"),
				],
				ephemeral: true,
			});
		}
	});

module.exports = command;

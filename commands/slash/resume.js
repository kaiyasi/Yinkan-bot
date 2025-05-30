const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
	.setName("resume")
	.setDescription("繼續播放當前曲目")
	.setRun(async (client, interaction, options) => {
		const queue = client.player.nodes.get(interaction.guild);
		
		if (!queue || !queue.currentTrack) {
			return interaction.reply({
				embeds: [client.ErrorEmbed("目前沒有正在播放的音樂", "播放狀態")],
				ephemeral: true,
			});
		}

		const member = interaction.member;
		if (!member.voice.channel) {
			return interaction.reply({
				embeds: [client.ErrorEmbed("請先加入語音頻道", "語音頻道錯誤")],
				ephemeral: true,
			});
		}

		if (!queue.node.isPaused()) {
			return interaction.reply({
				embeds: [client.WarningEmbed("音樂已經在播放中", "未暫停")],
				ephemeral: true,
			});
		}

		queue.node.setPaused(false);
		
		// 更新控制面板
		try {
			if (queue.metadata.controllerMessage) {
				await client.updatePlayerController(queue.metadata.controllerMessage, queue);
			}
		} catch (error) {
			console.error('更新控制面板錯誤:', error);
		}
		
		return interaction.reply({
			embeds: [client.SuccessEmbed("已繼續播放", "恢復播放")],
			ephemeral: true,
		});
	});

module.exports = command;
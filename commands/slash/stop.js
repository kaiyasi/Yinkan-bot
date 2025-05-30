const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
	.setName("stop")
	.setDescription("停止機器人正在播放的內容並離開語音頻道\n(此指令將清空播放佇列)")
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

		queue.delete();
		
		return interaction.reply({
			embeds: [client.SuccessEmbed("已停止播放並清空佇列，機器人已離開語音頻道", "停止播放")],
			ephemeral: true,
		});
	});

module.exports = command;
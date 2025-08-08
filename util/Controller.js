const { MessageEmbed, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
/**
 *
 * @param {import("../lib/DiscordMusicBot")} client
 * @param {import("discord.js").ButtonInteraction} interaction
 */
module.exports = async (client, interaction) => {
	let guild = client.guilds.cache.get(interaction.customId.split(":")[1]);
	let property = interaction.customId.split(":")[2];
	let player = client.manager.get(guild.id);

	if (!player) {
		await interaction.reply({
			embeds: [
				client.Embed("❌ | **There is no player to control in this server.**"),
			],
		});
		setTimeout(() => {
			interaction.deleteReply();
		}, 5000);
		return;
	}
	if (!interaction.member.voice.channel) {
		const joinEmbed = new MessageEmbed()
			.setColor(client.config.embedColor)
			.setDescription(
				"❌ | **You must be in a voice channel to use this action!**",
			);
		return interaction.reply({ embeds: [joinEmbed], ephemeral: true });
	}

	if (
		interaction.guild.members.me.voice.channel &&
		!interaction.guild.members.me.voice.channel.equals(interaction.member.voice.channel)
	) {
		const sameEmbed = new MessageEmbed()
			.setColor(client.config.embedColor)
			.setDescription(
				"❌ | **You must be in the same voice channel as me to use this action!**",
			);
		return await interaction.reply({ embeds: [sameEmbed], ephemeral: true });
	}

	if (property === "Stop") {
		player.queue.clear();
		player.stop();
		player.set("autoQueue", false);
		client.warn(`Player: ${ player.options.guild } | Successfully stopped the player`);
		const msg = await interaction.channel.send({
			embeds: [
				client.Embed(
					"⏹️ | **Successfully stopped the player**",
				),
			],
		});
		setTimeout(() => {
			msg.delete();
		}, 5000);

		interaction.update({
			components: [client.createController(player.options.guild, player)],
		});
		return;
	}

	// if theres no previous song, return an error.
	if (property === "Replay") {
		const previousSong = player.queue.previous;
		const currentSong = player.queue.current;
		const nextSong = player.queue[0]
        if (!player.queue.previous ||
            player.queue.previous === player.queue.current ||
            player.queue.previous === player.queue[0]) {
            
           return interaction.reply({
                        ephemeral: true,
			embeds: [
				new MessageEmbed()
					.setColor("RED")
					.setDescription(`There is no previous song played.`),
			],
		});
    }
		if (previousSong !== currentSong && previousSong !== nextSong) {
			player.queue.splice(0, 0, currentSong)
			player.play(previousSong);
			return interaction.deferUpdate();
		}
	}

	if (property === "PlayAndPause") {
		if (!player || (!player.playing && player.queue.totalSize === 0)) {
			const msg = await interaction.channel.send({
                               ephemeral: true,
				embeds: [
					new MessageEmbed()
						.setColor("RED")
						.setDescription("There is no song playing right now."),
				],
			});
			setTimeout(() => {
				msg.delete();
			}, 5000);
			return interaction.deferUpdate();
		} else {

			if (player.paused) {
				player.pause(false);
			} else {
				player.pause(true);
			}
			client.warn(`Player: ${ player.options.guild } | Successfully ${ player.paused? "paused" : "resumed" } the player`);

			return interaction.update({
				components: [client.createController(player.options.guild, player)],
			});
		}
	}

	if (property === "Next") {
                const song = player.queue.current;
	        const autoQueue = player.get("autoQueue");
                if (player.queue[0] == undefined && (!autoQueue || autoQueue === false)) {
		return interaction.reply({
                        ephemeral: true,
			embeds: [
				new MessageEmbed()
					.setColor("RED")
					.setDescription(`There is nothing after [${ song.title }](${ song.uri }) in the queue.`),
			],
		})} else player.stop();
		return interaction.deferUpdate
    }

	if (property === "Loop") {
		if (player.trackRepeat) {
			player.setTrackRepeat(false);
			player.setQueueRepeat(true);
		} else if (player.queueRepeat) {
			player.setQueueRepeat(false);
		} else {
			player.setTrackRepeat(true);
		}
		client.warn(`Player: ${player.options.guild} | Successfully toggled loop ${player.trackRepeat ? "on" : player.queueRepeat ? "queue on" : "off"} the player`);

		interaction.update({
			components: [client.createController(player.options.guild, player)],
		});
		return;
	}

	return interaction.reply({
		ephemeral: true,
		content: "❌ | **Unknown controller option**",
	});
};

class Controller {
    static createPlayerController(queue) {
        const isPaused = queue?.node?.isPaused();
        const repeatMode = queue?.repeatMode ?? 0;

        let loopStyle = ButtonStyle.Secondary;
        let loopEmoji = '➡️';
        let loopLabel = '循環';

        if (repeatMode === 1) {
            loopStyle = ButtonStyle.Success;
            loopEmoji = '🔂';
            loopLabel = '單曲循環';
        } else if (repeatMode === 2) {
            loopStyle = ButtonStyle.Success;
            loopEmoji = '🔁';
            loopLabel = '佇列循環';
        }

        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_previous')
                    .setLabel('上一首')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!queue || !queue.history?.tracks?.data?.length),
                
                new ButtonBuilder()
                    .setCustomId('music_playpause')
                    .setLabel(isPaused ? '播放' : '暫停')
                    .setEmoji(isPaused ? '▶️' : '⏸️')
                    .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary)
                    .setDisabled(!queue || !queue.currentTrack),
                
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('下一首')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!queue || !queue.tracks?.data?.length),
                
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel(loopLabel)
                    .setEmoji(loopEmoji)
                    .setStyle(loopStyle)
                    .setDisabled(!queue || !queue.currentTrack),

                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('停止')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!queue || !queue.currentTrack)
            );
    }
}

module.exports = Controller;

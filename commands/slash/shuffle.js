const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("shuffle")
    .setDescription("隨機播放佇列中的歌曲")
    .setSelfDefer(true)
    .setRun(async (client, interaction) => {
        await interaction.deferReply();

        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.editReply({ embeds: [client.ErrorEmbed("目前沒有正在播放的音樂")] });
        }

        if (queue.tracks.size < 2) {
            return interaction.editReply({ embeds: [client.ErrorEmbed("佇列中至少需要 2 首歌曲才能進行隨機播放")] });
        }

        try {
            queue.tracks.shuffle();

            const shuffleEmbed = client.SuccessEmbed("🔀 | 播放佇列已成功隨機排序。")
                .addFields({
                    name: "🎵 下一首歌曲",
                    value: `[${queue.tracks.at(0).title}](${queue.tracks.at(0).url})`
                });

            return interaction.editReply({ embeds: [shuffleEmbed] });
        } catch (error) {
            console.error('隨機播放時發生錯誤:', error);
            return interaction.editReply({ embeds: [client.ErrorEmbed("隨機播放時發生未預期的錯誤。")] });
        }
    });

module.exports = command;
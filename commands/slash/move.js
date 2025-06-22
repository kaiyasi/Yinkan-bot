const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("move")
    .setDescription("將歌曲移動到不同的位置")
    .setSelfDefer(true)
    .addIntegerOption((option) =>
        option
            .setName("track_number")
            .setDescription("要移動的歌曲編號")
            .setRequired(true)
            .setMinValue(1)
    )
    .addIntegerOption((option) =>
        option
            .setName("new_position")
            .setDescription("要移動到的新位置")
            .setRequired(true)
            .setMinValue(1)
    )
    .setRun(async (client, interaction) => {
        await interaction.deferReply();
        
        const track = interaction.options.getInteger("track_number");
        const position = interaction.options.getInteger("new_position");

        const queue = client.player.nodes.get(interaction.guild.id);

        if (!queue || !queue.currentTrack) {
            return interaction.editReply({
                embeds: [client.ErrorEmbed("目前沒有正在播放內容")],
            });
        }

        if (!queue.tracks || queue.tracks.size === 0) {
            return interaction.editReply({
                embeds: [client.ErrorEmbed("播放佇列是空的")],
            });
        }

        if (track < 1 || position < 1) {
            return interaction.editReply({
                embeds: [client.ErrorEmbed("歌曲編號和新位置必須大於 0")],
            });
        }

        if (track > queue.tracks.size || position > queue.tracks.size) {
            return interaction.editReply({
                embeds: [
                    client.ErrorEmbed(`歌曲編號和新位置不能超過佇列長度 (${queue.tracks.size})`),
                ],
            });
        }

        if (track === position) {
            return interaction.editReply({
                embeds: [client.ErrorEmbed("歌曲已經在指定位置")],
            });
        }

        try {
            // 獲取要移動的歌曲
            const targetTrack = queue.tracks.at(track - 1);
            
            if (!targetTrack) {
                return interaction.editReply({
                    embeds: [client.ErrorEmbed("找不到指定的歌曲")],
                });
            }

            // 移動歌曲
            queue.tracks.remove(track - 1);
            queue.tracks.insert(targetTrack, position - 1);

            return interaction.editReply({
                embeds: [
                    client.SuccessEmbed(`🔄 | 已將歌曲 **${targetTrack.title}** 從位置 **${track}** 移動到位置 **${position}**`),
                ],
            });
        } catch (error) {
            console.error('移動歌曲時發生錯誤:', error);
            return interaction.editReply({
                embeds: [client.ErrorEmbed("移動歌曲時發生錯誤")],
            });
        }
    });

module.exports = command;
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

        let channel = await client.getChannel(client, interaction);
        if (!channel) {
            return;
        }

        let player;
        if (client.player) {
            player = client.player.nodes.get(interaction.guild.id);
        } else {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("Discord Player 未初始化"),
                ],
            });
        }

        if (!player) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("RED")
                        .setDescription("目前沒有正在播放內容"),
                ],
            });
        }

        if (!player.queue || player.queue.size === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("RED")
                        .setDescription("播放佇列是空的"),
                ],
            });
        }

        if (track < 1 || position < 1) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("RED")
                        .setDescription("歌曲編號和新位置必須大於 0"),
                ],
            });
        }

        if (track > player.queue.size || position > player.queue.size) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("RED")
                        .setDescription(`歌曲編號和新位置不能超過佇列長度 (${player.queue.size})`),
                ],
            });
        }

        if (track === position) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("RED")
                        .setDescription("歌曲已經在指定位置"),
                ],
            });
        }

        try {
            // 獲取要移動的歌曲
            const tracks = player.queue.tracks.toArray();
            const targetTrack = tracks[track - 1];
            
            if (!targetTrack) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("RED")
                            .setDescription("找不到指定的歌曲"),
                    ],
                });
            }

            // 移動歌曲
            player.queue.remove(track - 1);
            player.queue.insert(targetTrack, position - 1);

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setDescription(`🔄 | 已將歌曲 **${targetTrack.title}** 從位置 **${track}** 移動到位置 **${position}**`),
                ],
            });
        } catch (error) {
            console.error('移動歌曲時發生錯誤:', error);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("RED")
                        .setDescription("移動歌曲時發生錯誤"),
                ],
            });
        }
    });

module.exports = command;
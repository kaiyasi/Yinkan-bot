const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");

const command = new SlashCommand()
    .setName("loop")
    .setDescription("循環播放當前歌曲")
    .setSelfDefer(true)
    .setRun(async (client, interaction, options) => {
        await interaction.deferReply();
        
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
                        .setColor("RED")
                        .setDescription("Lavalink 節點未連接"),
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
                ephemeral: true,
            });
        }

        // 切換循環模式
        const newRepeatMode = player.repeatMode === 'track' ? 'off' : 'track';
        player.setRepeatMode(newRepeatMode);

        if (newRepeatMode === 'track') {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setDescription(`🔂 | **單曲循環模式已啟用**`),
                ],
            });
        } else {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setDescription(`⏹️ | **循環播放模式已關閉**`),
                ],
            });
        }
    });

module.exports = command;
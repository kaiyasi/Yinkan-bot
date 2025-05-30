const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("pause")
    .setDescription("暫停目前播放的歌曲")
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

        if (queue.node.isPaused()) {
            return interaction.reply({
                embeds: [client.WarningEmbed("音樂已經是暫停狀態", "已暫停")],
                ephemeral: true,
            });
        }

        queue.node.setPaused(true);
        
        return interaction.reply({
            embeds: [client.SuccessEmbed("已暫停播放", "暫停音樂")],
            ephemeral: true,
        });
    });

module.exports = command;

const SlashCommand = require("../../lib/SlashCommand");
const { QueueRepeatMode } = require("discord-player");

const command = new SlashCommand()
    .setName("loop")
    .setDescription("設定歌曲或佇列的循環模式")
    .setCategory("music")
    .addStringOption(option =>
        option.setName('mode')
            .setDescription('選擇循環模式')
            .setRequired(true)
            .addChoices(
                { name: '❌ 關閉', value: 'off' },
                { name: '🔂 單曲循環', value: 'track' },
                { name: '🔁 佇列循環', value: 'queue' }
            )
    )
    .setRun(async (client, interaction) => {
        const queue = client.player.nodes.get(interaction.guildId);
        if (!queue || !queue.currentTrack) {
            return interaction.reply({ embeds: [client.ErrorEmbed("目前沒有正在播放音樂。")], ephemeral: true });
        }

        const mode = interaction.options.getString('mode', true);
        let newMode;
        let replyText;

        switch (mode) {
            case 'track':
                newMode = QueueRepeatMode.TRACK;
                replyText = '🔂 | 單曲循環模式已啟用';
                break;
            case 'queue':
                newMode = QueueRepeatMode.QUEUE;
                replyText = '🔁 | 佇列循環模式已啟用';
                break;
            default:
                newMode = QueueRepeatMode.OFF;
                replyText = '❌ | 循環模式已關閉';
                break;
        }

        queue.setRepeatMode(newMode);
        
        // 更新控制器
        if (queue.metadata?.controllerMessage) {
            await client.updatePlayerController(queue.metadata.controllerMessage, queue).catch(()=>{});
        }

        return interaction.reply({ embeds: [client.SuccessEmbed(replyText)], ephemeral: true });
    });

module.exports = command;
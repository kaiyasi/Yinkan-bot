const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("filters")
    .setDescription("應用音頻濾鏡效果")
    .setCategory("music")
    .setSelfDefer(true)
    .addStringOption((option) =>
        option
            .setName("preset")
            .setDescription("要套用的預設濾鏡")
            .setRequired(true)
            .addChoices(
                { name: "🌙 夜核", value: "nightcore" },
                { name: "🔊 重低音", value: "bassboost" },
                { name: "🌊 蒸氣波", value: "vaporwave" },
                { name: "🌀 8D立體", value: "8D" },
                { name: "🎤 卡拉OK", value: "karaoke" },
                { name: "❌ 關閉", value: "off" },
            ),
    )
    .setRun(async (client, interaction) => {
        await interaction.deferReply();
        
        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.editReply({ embeds: [client.ErrorEmbed("目前沒有正在播放音樂")] });
        }

        const preset = interaction.options.getString("preset");
        
        if (preset === 'off') {
            await queue.filters.ffmpeg.setFilters(false);
            return interaction.editReply({ embeds: [client.SuccessEmbed("❌ | 所有濾鏡已重置")] });
        }
        
        const enabled = await queue.filters.ffmpeg.toggle(preset);

        const filtersEmbed = client.SuccessEmbed(`🎵 | **${preset}** 濾鏡已 ${enabled ? '啟用' : '關閉'}`);
        
        return interaction.editReply({ embeds: [filtersEmbed] });
    });

module.exports = command;
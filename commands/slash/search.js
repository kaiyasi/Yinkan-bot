const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

// 動態導入 pretty-ms
let prettyMs;
(async () => {
  try {
    prettyMs = (await import('pretty-ms')).default;
  } catch (error) {
    console.error("無法載入 pretty-ms:", error);
  }
})();

const command = new SlashCommand()
    .setName("search")
    .setDescription("搜尋歌曲並從清單中選擇")
    .addStringOption(option =>
        option.setName("query")
            .setDescription("要搜尋的歌曲名稱")
            .setRequired(true)
    )
    .setRun(async (client, interaction) => {
        await interaction.deferReply();

        const query = interaction.options.getString("query", true);
        const searchResult = await client.player.search(query, { requestedBy: interaction.user });

        if (!searchResult || !searchResult.hasTracks()) {
            return interaction.editReply({ embeds: [client.ErrorEmbed(`❌ | 找不到關於 \`${query}\` 的結果！`)] });
        }

        const tracks = searchResult.tracks.slice(0, 10);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("search-select")
            .setPlaceholder("從清單中選擇一首歌")
            .addOptions(tracks.map((track, i) => ({
                label: `${i + 1}. ${track.title.slice(0, 40)}`,
                description: `作者: ${track.author} | 長度: ${track.duration}`,
                value: track.url,
            })));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`🔍 \`${query}\` 的搜尋結果`)
            .setDescription("請從下方的選單中選擇一首歌來播放。");

        const response = await interaction.editReply({ embeds: [embed], components: [row] });

        const collector = response.createMessageComponentCollector({
            time: 30000, // 30 秒
            filter: i => i.user.id === interaction.user.id,
        });

        collector.on("collect", async i => {
            if (i.customId === "search-select") {
                await i.deferUpdate();
                const selectedUrl = i.values[0];
                
                await interaction.editReply({ embeds: [client.MusicEmbed(`🔍 | 正在載入您選擇的歌曲...`)], components: [] });

                const playResult = await client.player.search(selectedUrl, { requestedBy: interaction.user });
                if (!playResult.hasTracks()) {
                    return interaction.followUp({ embeds: [client.ErrorEmbed("無法播放選擇的歌曲。")], ephemeral: true });
                }

                try {
                    await client.player.play(interaction.member.voice.channel, playResult, {
                        nodeOptions: { metadata: { channel: interaction.channel } }
                    });
                } catch (e) {
                    console.error(e);
                    await interaction.followUp({ embeds: [client.ErrorEmbed(`❌ | 播放時發生錯誤: ${e.message}`)], ephemeral: true });
                }
            }
        });

        collector.on("end", () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    });

module.exports = command;
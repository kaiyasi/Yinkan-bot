const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");
const lyricsApi = require("../../util/lyricsApi");

const command = new SlashCommand()
    .setName("lyrics")
    .setDescription("顯示歌曲的歌詞")
    .setCategory("music")
    .addStringOption((option) =>
        option
            .setName("query")
            .setDescription("要搜尋的歌曲名稱（可選，預設為目前播放歌曲）")
            .setRequired(false)
    )
    .setSelfDefer(false)
    .setRun(async (client, interaction) => {
        await interaction.deferReply();

        const queue = client.player.nodes.get(interaction.guild);
        const songName = interaction.options.getString("query");

        let searchQuery = songName;
        if (!searchQuery && queue && queue.currentTrack) {
            // 清理標題，移除 (Official Video) 等多餘部分以提高搜尋準確率
            searchQuery = queue.currentTrack.title.replace(/\(.*\)|\[.*\]/g, '').trim();
        }

        if (!searchQuery) {
            return interaction.editReply({
                embeds: [client.ErrorEmbed("請提供歌曲名稱，或播放一首歌。")]
            });
        }

        try {
            const lyricsData = await lyricsApi.searchLyrics(searchQuery);

            if (!lyricsData) {
                return interaction.editReply({
                    embeds: [client.ErrorEmbed(`❌ | 找不到關於 \`${searchQuery}\` 的歌詞。`)]
                });
            }

            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(lyricsData.title)
                .setURL(lyricsData.url)
                .setAuthor({ name: lyricsData.artist })
                .setDescription(
                    lyricsData.lyrics.length > 4096 
                        ? lyricsData.lyrics.substring(0, 4093) + "..." 
                        : lyricsData.lyrics
                )
                .setThumbnail(lyricsData.thumbnail)
                .setFooter({ text: "歌詞由 Genius 提供" });

            return interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error("取得歌詞時發生錯誤:", error);
            return interaction.editReply({
                embeds: [client.ErrorEmbed("取得歌詞時發生未預期的錯誤。")]
            });
        }
    });

module.exports = command;
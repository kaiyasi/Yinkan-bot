const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");
const { MessageActionRow, MessageSelectMenu, MessageButton } = require("discord.js");
let fetch;
(async () => {
    fetch = (await import('node-fetch')).default;
})();
const lyricsApi = require("../../util/lyricsApi"); 

const command = new SlashCommand()
    .setName("lyrics")
    .setDescription("顯示目前播放歌曲的歌詞")
    .addStringOption((option) =>
        option
            .setName("歌曲名稱")
            .setDescription("要搜尋歌詞的歌曲名稱")
            .setRequired(false)
    )
    .setRun(async (client, interaction) => {
        await interaction.deferReply();
        
        const queue = client.player.nodes.get(interaction.guild);
        const songName = interaction.options.getString("歌曲名稱");

        if (!queue && !songName) {
            return interaction.editReply({
                embeds: [client.ErrorEmbed("目前沒有正在播放的內容，請提供歌曲名稱。")]
            });
        }

        let searchQuery = songName;
        if (!searchQuery && queue && queue.currentTrack) {
            searchQuery = queue.currentTrack.title;
        }

        if (!searchQuery) {
            return interaction.editReply({
                embeds: [client.ErrorEmbed("無法獲取歌曲名稱。")]
            });
        }

        try {
            if (!fetch) {
                return interaction.editReply({
                    embeds: [client.ErrorEmbed("歌詞功能暫時無法使用，請稍後再試。")]
                });
            }

            const lyrics = await lyricsApi.searchLyrics(searchQuery);
            
            if (!lyrics) {
                return interaction.editReply({
                    embeds: [client.ErrorEmbed(`找不到 "${searchQuery}" 的歌詞。`)]
                });
            }

            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(`🎵 ${lyrics.title}`)
                .setDescription(lyrics.lyrics.length > 4096 ? lyrics.lyrics.substring(0, 4093) + "..." : lyrics.lyrics)
                .setFooter({ text: `歌手: ${lyrics.artist}` });

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("歌詞搜尋錯誤:", error);
            return interaction.editReply({
                embeds: [client.ErrorEmbed("搜尋歌詞時發生錯誤。")]
            });
        }
    });

module.exports = command;

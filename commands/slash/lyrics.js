const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder } = require("discord.js");

let fetch;
(async () => {
    fetch = (await import('node-fetch')).default;
})();

const lyricsApi = require("../../util/lyricsApi");

const command = new SlashCommand()
    .setName("lyrics")
    .setDescription("顯示正在播放歌曲的歌詞")
    .addStringOption((option) =>
        option
            .setName("song_name")
            .setDescription("搜尋歌詞的歌曲名稱")
            .setRequired(false)
    )
    .setSelfDefer(true) // 設置 selfDefer 屬性，表示此指令會自行處理延遲回覆
    .setRun(async (client, interaction) => {
        await interaction.deferReply();

        const queue = client.player.nodes.get(interaction.guild);
        const songName = interaction.options.getString("song_name");

        if (!queue && !songName) {
            return interaction.editReply({
                embeds: [client.ErrorEmbed("目前沒有正在播放內容，請提供歌曲名稱")]
            });
        }

        let searchQuery = songName;
        if (!searchQuery && queue && queue.currentTrack) {
            searchQuery = queue.currentTrack.title;
        }

        if (!searchQuery) {
            return interaction.editReply({
                embeds: [client.ErrorEmbed("無法取得歌曲名稱")]
            });
        }

        try {
            if (!fetch) {
                return interaction.editReply({
                    embeds: [client.ErrorEmbed("歌詞功能暫時無法使用，請稍後重試")]
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
                .setDescription(
                    lyrics.lyrics.length > 4096 
                        ? lyrics.lyrics.substring(0, 4093) + "..." 
                        : lyrics.lyrics
                )
                .setFooter({
                    text: `演唱者: ${lyrics.artist}`
                });

            return interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error("取得歌詞時發生錯誤:", error);
            return interaction.editReply({
                embeds: [client.ErrorEmbed("取得歌詞時發生錯誤")]
            });
        }
    });

module.exports = command;
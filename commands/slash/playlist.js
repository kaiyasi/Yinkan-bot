// 這個檔案是用來處理 Discord Slash Command 的播放清單功能

const { QueryType } = require("discord-player");
const { EmbedBuilder } = require("discord.js");
const path = require("path");

// 為了方便管理，我們假設您有一個指令的基底類別
// 如果沒有，您可以直接導出一個物件
// 這邊為了符合您的原始碼結構，我們就地建立一個模擬的 SlashCommand
class SlashCommand {
    constructor() {
        this.data = {
            name: '',
            description: '',
            options: [],
        };
        this._run = async () => {};
    }
    setName(name) {
        this.data.name = name;
        return this;
    }
    setDescription(description) {
        this.data.description = description;
        return this;
    }
    addStringOption(option) {
        // 這是一個簡化的實作，實際上 discord.js 的 option builder 更複雜
        this.data.options.push(option({
            setName: (name) => ({
                setDescription: (desc) => ({
                    setRequired: (req) => ({ name, description: desc, required: req, type: 'string' })
                })
            })
        }));
        return this;
    }
    setRun(fn) {
        this._run = fn;
        return this;
    }
    // 添加一個執行方法，讓主文件可以呼叫
    get run() {
        return this._run;
    }
    // 添加一個 name getter，讓主文件可以讀取
    get name() {
        return this.data.name;
    }
}


const command = new SlashCommand()
    .setName("playlist")
    .setDescription("播放一個 YouTube 或 Spotify 播放清單")
    .addStringOption(option =>
        option.setName("url")
        .setDescription("輸入播放清單的 URL")
        .setRequired(true)
    )
    .setRun(async (client, interaction) => {
        // 檢查使用者是否在語音頻道中
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [client.ErrorEmbed("您必須先加入一個語音頻道！")],
                ephemeral: true,
            });
        }

        // 延遲回覆，因為搜尋可能需要時間
        await interaction.deferReply();

        const url = interaction.options.getString("url", true);

        try {
            // 使用 discord-player 搜尋播放清單
            const searchResult = await client.player.search(url, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO, // 自動偵測來源 (YouTube, Spotify, etc.)
            });

            // 檢查是否找到播放清單
            if (!searchResult || !searchResult.playlist) {
                return interaction.editReply({
                    embeds: [client.ErrorEmbed(`❌ | 找不到指定的播放清單。\n請檢查 URL 是否正確且播放清單為公開。`)],
                });
            }

            // 將整個播放清單加入佇列
            await client.player.play(voiceChannel, searchResult, {
                nodeOptions: {
                    // 將互動資訊傳遞給 player event，方便後續操作
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild.members.me,
                        requestedBy: interaction.user,
                    },
                    selfDeaf: true,
                    volume: 80, // 您可以從 config 中讀取
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 300000,
                },
            });
            
            // 由於 discord-player 的事件會處理新增歌曲的通知，
            // 這裡我們只回覆一個總的成功訊息。
            // audioTracksAdd 事件將會發送更詳細的嵌入訊息。
            const playlist = searchResult.playlist;
            return interaction.editReply({
                embeds: [client.SuccessEmbed(`已成功將播放清單 **${playlist.title}** (${playlist.tracks.length} 首歌曲) 加入佇列！`)],
            });

        } catch (e) {
            console.error(e);
            // 提供更詳細的錯誤訊息給使用者
            let errorMessage = `發生未知錯誤: ${e.message}`;
            if (e.message.includes("Could not find a match for")) {
                errorMessage = "無法識別此 URL。請確認它是有效的 YouTube 或 Spotify 播放清單連結。";
            } else if (e.message.includes("Sign in to view this playlist") || e.message.includes("private")) {
                 errorMessage = "無法存取此播放清單。它可能是私人的或需要登入才能觀看。";
            }
            
            return interaction.editReply({
                embeds: [client.ErrorEmbed(errorMessage, "播放清單錯誤")]
            });
        }
    });

module.exports = command;

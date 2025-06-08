const { EmbedBuilder } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("filters")
    .setDescription("應用音頻濾鏡效果")
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
                { name: "🎵 流行", value: "pop" },
                { name: "🕊️ 柔和", value: "soft" },
                { name: "🎼 高音低音", value: "treblebass" },
                { name: "🌀 8D立體", value: "eightD" },
                { name: "🎤 卡拉OK", value: "karaoke" },
                { name: "🎶 顫音", value: "vibrato" },
                { name: "📳 震音", value: "tremolo" },
                { name: "❌ 關閉", value: "off" },
            ),
    )
    .setRun(async (client, interaction, options) => {
        await interaction.deferReply();
        
        const args = interaction.options.getString("preset");

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
                        .setDescription("目前沒有正在播放音樂"),
                ],
                ephemeral: true,
            });
        }

        // 建立一個新的嵌入訊息
        let filtersEmbed = new EmbedBuilder().setColor(client.config.embedColor);

        if (args == "nightcore") {
            filtersEmbed.setDescription("🌙 | 夜核濾鏡已套用");
            player.filters.setTimescale({ speed: 1.2, pitch: 1.2, rate: 1 });
        } else if (args == "bassboost") {
            filtersEmbed.setDescription("🔊 | 重低音濾鏡已套用");
            player.filters.setEqualizer([
                { band: 0, gain: 0.1 },
                { band: 1, gain: 0.1 },
                { band: 2, gain: 0.05 },
                { band: 3, gain: 0.05 }
            ]);
        } else if (args == "vaporwave") {
            filtersEmbed.setDescription("🌊 | 蒸氣波濾鏡已套用");
            player.filters.setTimescale({ speed: 0.8, pitch: 0.8, rate: 1 });
        } else if (args == "pop") {
            filtersEmbed.setDescription("🎵 | 流行音樂濾鏡已套用");
            player.filters.setEqualizer([
                { band: 0, gain: 0.65 },
                { band: 1, gain: 0.45 },
                { band: 2, gain: -0.45 },
                { band: 3, gain: -0.65 },
                { band: 4, gain: -0.35 }
            ]);
        } else if (args == "soft") {
            filtersEmbed.setDescription("🕊️ | 柔和濾鏡已套用");
            player.filters.setLowPass({ smoothing: 20 });
        } else if (args == "treblebass") {
            filtersEmbed.setDescription("🎼 | 高音低音濾鏡已套用");
            player.filters.setEqualizer([
                { band: 0, gain: 0.6 },
                { band: 1, gain: 0.67 },
                { band: 2, gain: 0.67 },
                { band: 3, gain: 0 },
                { band: 4, gain: -0.5 },
                { band: 5, gain: 0.15 },
                { band: 6, gain: -0.45 },
                { band: 7, gain: 0.23 },
                { band: 8, gain: 0.35 },
                { band: 9, gain: 0.45 },
                { band: 10, gain: 0.55 },
                { band: 11, gain: 0.6 },
                { band: 12, gain: 0.55 },
                { band: 13, gain: 0 }
            ]);
        } else if (args == "eightD") {
            filtersEmbed.setDescription("🌀 | 8D立體音效已套用");
            player.filters.setRotation({ rotationHz: 0.2 });
        } else if (args == "karaoke") {
            filtersEmbed.setDescription("🎤 | 卡拉OK濾鏡已套用");
            player.filters.setKaraoke({
                level: 1.0,
                monoLevel: 1.0,
                filterBand: 220.0,
                filterWidth: 100.0
            });
        } else if (args == "vibrato") {
            filtersEmbed.setDescription("🎶 | 顫音濾鏡已套用");
            player.filters.setVibrato({ frequency: 4.0, depth: 0.75 });
        } else if (args == "tremolo") {
            filtersEmbed.setDescription("📳 | 震音濾鏡已套用");
            player.filters.setTremolo({ frequency: 4.0, depth: 0.75 });
        } else if (args == "off") {
            filtersEmbed.setDescription("❌ | 所有濾鏡已重置");
            player.filters.clearFilters();
        } else {
            filtersEmbed.setDescription("⚠️ | 未知的音頻濾鏡");
        }

        return interaction.editReply({
            embeds: [filtersEmbed]
        });
    });

module.exports = command;
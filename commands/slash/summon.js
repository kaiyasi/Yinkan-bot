const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder } = require("discord.js");
const { joinVoiceChannel } = require('@discordjs/voice');

const command = new SlashCommand()
    .setName("summon")
    .setDescription("召喚機器人到您的語音頻道")
    .setSelfDefer(true)
    .setRun(async (client, interaction, options) => {
        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply({ embeds: [client.ErrorEmbed("您必須在一個語音頻道中才能使用此指令。")] });
        }

        try {
            joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: true,
            });

            return interaction.editReply({ embeds: [client.SuccessEmbed(`👋 | 已成功加入語音頻道 **${voiceChannel.name}**`)] });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [client.ErrorEmbed("無法加入您的語音頻道。")] });
        }
    });

module.exports = command;
const SlashCommand = require("../../lib/SlashCommand");
const {
    Client,
    Interaction,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    ButtonStyle,
} = require("discord.js");
const LoadCommands = require("../../util/loadCommands");

const command = new SlashCommand()
    .setName("help")
    .setDescription("顯示指令清單")
    .setSelfDefer(true) // 設置 selfDefer 屬性，表示此指令會自行處理延遲回覆
    .setRun(async (client, interaction) => {
        await interaction.deferReply().catch((_) => {});

        const commands = await LoadCommands().then((cmds) => {
            return [].concat(cmds.slash);
        });

        const filteredCommands = commands.filter(
            (cmd) => cmd.description != "null"
        );

        const totalCmds = filteredCommands.length;
        let maxPages = Math.ceil(totalCmds / client.config.helpCmdPerPage);

        let gitHash = "";
        try {
            gitHash = require("child_process")
                .execSync("git rev-parse --short HEAD")
                .toString()
                .trim();
        } catch (e) {
            gitHash = "unknown";
        }

        let pageNo = 0;

        const helpEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setAuthor({
                name: `${client.user.username} 指令清單`,
                iconURL: client.config.iconURL,
            })
            .setTimestamp()
            .setFooter({
                text: `第 ${pageNo + 1} 頁，共 ${maxPages} 頁`
            });

        var tempArray = filteredCommands.slice(
            pageNo * client.config.helpCmdPerPage,
            pageNo * client.config.helpCmdPerPage + client.config.helpCmdPerPage
        );

        tempArray.forEach((cmd) => {
            helpEmbed.addFields({
                name: cmd.name,
                value: cmd.description
            });
        });

        helpEmbed.addFields({
            name: "🔧 製作資訊",
            value: `Discord 音樂機器人 v${require("../../package.json").version}; 構建版本: ${gitHash}` +
                "\n" +
                `[支援伺服器](${client.config.supportServer}) | [問題回報](${client.config.Issues}) | [原始碼](https://github.com/SudhanPlayz/Discord-MusicBot/tree/v5) | [邀請機器人](https://discord.com/oauth2/authorize?client_id=${client.config.clientId}&permissions=${client.config.permissions}&scope=bot%20applications.commands)`,
        });

        // 分頁按鈕功能
        const getButtons = (pageNo) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("help_cmd_but_2_app")
                    .setEmoji("⬅")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageNo === 0),
                new ButtonBuilder()
                    .setCustomId("help_cmd_but_1_app")
                    .setEmoji("➡")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageNo === maxPages - 1)
            );
        };

        const buttons = getButtons(pageNo);

        const response = await interaction.editReply({
            embeds: [helpEmbed],
            components: [buttons],
            fetchReply: true,
        });

        const collector = response.createMessageComponentCollector({
            time: 600000,
            componentType: "BUTTON",
        });

        collector.on("collect", async (iter) => {
            if (iter.customId === "help_cmd_but_1_app") {
                pageNo++;
            } else if (iter.customId === "help_cmd_but_2_app") {
                pageNo--;
            }

            helpEmbed.fields = [];

            var tempArray = filteredCommands.slice(
                pageNo * client.config.helpCmdPerPage,
                pageNo * client.config.helpCmdPerPage + client.config.helpCmdPerPage
            );

            tempArray.forEach((cmd) => {
                helpEmbed
                    .addFields({
                        name: cmd.name,
                        value: cmd.description
                    })
                    .setFooter({
                        text: `第 ${pageNo + 1} 頁，共 ${maxPages} 頁`
                    });
            });

            helpEmbed.addFields({
                name: "🔧 製作資訊",
                value: `Discord 音樂機器人 v${require("../../package.json").version}; 構建版本: ${gitHash}` +
                    "\n" +
                    `[支援伺服器](${client.config.supportServer}) | [問題回報](${client.config.Issues}) | [原始碼](https://github.com/SudhanPlayz/Discord-MusicBot/tree/v5) | [邀請機器人](https://discord.com/oauth2/authorize?client_id=${client.config.clientId}&permissions=${client.config.permissions}&scope=bot%20applications.commands)`,
            });

            await iter.update({
                embeds: [helpEmbed],
                components: [getButtons(pageNo)],
                fetchReply: true,
            });
        });
    });

module.exports = command;
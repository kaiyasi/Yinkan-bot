const colors = require("colors");
const { EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");
const fs = require('fs');
const path = require('path');

const command = new SlashCommand()
    .setName("dynamicvoice")
    .setDescription("設置動態語音頻道系統")
    .setSelfDefer(true)
    .addSubcommand((subcommand) =>
        subcommand
            .setName("setup")
            .setDescription("設置動態語音頻道")
            .addStringOption((option) =>
                option
                    .setName("template")
                    .setDescription("新建頻道的名稱模板，使用 {username} 作為使用者名稱")
                    .setRequired(true)
            )
            .addChannelOption((option) =>
                option
                    .setName("category")
                    .setDescription("頻道分類")
                    .setRequired(false)
            )
            .addChannelOption((option) =>
                option
                    .setName("entry_channel")
                    .setDescription("設置進入頻道")
                    .setRequired(false)
            )
            .addStringOption((option) =>
                option
                    .setName("entry_name")
                    .setDescription("進入頻道名稱")
                    .setRequired(false)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("disable").setDescription("停用動態語音頻道系統")
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("status").setDescription("查看動態語音頻道設定")
    )
    .setRun(async (client, interaction) => {
        await interaction.deferReply();
        
        // 檢查權限
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.editReply({
                embeds: [
                    client.ErrorEmbed("你沒有管理頻道的權限！", "權限不足")
                ],
                ephemeral: true,
            });
        }

        const subcommand = interaction.options.getSubcommand();

        // 確保資料結構存在
        if (!client.dynamicVoice) {
            client.dynamicVoice = new Map();
        }

        // 第一次設置時會設置事件監聽器
        if (!client.dynamicVoiceListenerSetup) {
            setupEventListener(client);
        }

        if (subcommand === 'setup') {
            const template = interaction.options.getString('template') || '{username} 的頻道';
            const category = interaction.options.getChannel('category');
            const entryChannel = interaction.options.getChannel('entry_channel');
            const entryName = interaction.options.getString('entry_name') || '點擊加入以創建頻道';

            try {
                let controlChannel;
                if (entryChannel) {
                    // 使用現有頻道
                    if (entryChannel.type !== ChannelType.GuildVoice) {
                        return interaction.editReply({
                            embeds: [
                                client.ErrorEmbed("指定的頻道不是語音頻道", "頻道類型錯誤")
                            ],
                            ephemeral: true
                        });
                    }
                    controlChannel = entryChannel;
                } else {
                    // 建立控制頻道
                    controlChannel = await interaction.guild.channels.create({
                        name: entryName,
                        type: ChannelType.GuildVoice,
                        parent: category ? category.id : null,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
                            }
                        ]
                    });
                }

                // 儲存設定
                client.dynamicVoice.set(interaction.guild.id, {
                    controlChannelId: controlChannel.id,
                    template: template,
                    categoryId: category ? category.id : null,
                    createdChannels: [],
                    isCreatedByBot: !entryChannel // 標記是否由機器人建立
                });

                // 儲存到硬碟
                saveDynamicVoiceSettings(client);

                console.log(
                    `伺服器 ${interaction.guild.id} | [動態語音] 已設定在 ${interaction.guild.name}`
                );

                return interaction.editReply({
                    embeds: [
                        client.SuccessEmbed(
                            `已設定控制頻道為 ${controlChannel}\n當使用者加入此頻道時將自動創建新的語音頻道。`,
                            "✅ 動態語音頻道已設定"
                        )
                    ]
                });
            } catch (error) {
                console.error('設置動態語音頻道時發生錯誤:', error);
                return interaction.editReply({
                    embeds: [
                        client.ErrorEmbed(`設定過程中發生錯誤: ${error.message}`, "設定失敗")
                    ],
                    ephemeral: true
                });
            }
        } else if (subcommand === 'disable') {
            if (!client.dynamicVoice || !client.dynamicVoice.has(interaction.guild.id)) {
                return interaction.editReply({
                    embeds: [
                        client.ErrorEmbed('此伺服器尚未設定動態語音頻道！', "未設定")
                    ],
                    ephemeral: true
                });
            }

            try {
                const settings = client.dynamicVoice.get(interaction.guild.id);

                // 刪除控制頻道（只會在由機器人創建的情況下刪除）
                const controlChannel = interaction.guild.channels.cache.get(settings.controlChannelId);
                if (controlChannel && settings.isCreatedByBot) {
                    await controlChannel.delete();
                }

                // 刪除已建立的頻道
                for (const channelId of settings.createdChannels) {
                    const channel = interaction.guild.channels.cache.get(channelId);
                    if (channel) await channel.delete().catch(() => {});
                }

                // 刪除設定
                client.dynamicVoice.delete(interaction.guild.id);
                saveDynamicVoiceSettings(client);

                console.log(
                    `伺服器 ${interaction.guild.id} | [動態語音] 已停用在 ${interaction.guild.name}`
                );

                return interaction.editReply({
                    embeds: [
                        client.SuccessEmbed('動態語音頻道系統已停用！', "✅ 動態語音頻道已停用")
                    ]
                });
            } catch (error) {
                console.error('停用動態語音頻道時發生錯誤:', error);
                return interaction.editReply({
                    embeds: [
                        client.ErrorEmbed(`停用過程中發生錯誤: ${error.message}`, "停用失敗")
                    ],
                    ephemeral: true
                });
            }
        } else if (subcommand === 'status') {
            if (!client.dynamicVoice || !client.dynamicVoice.has(interaction.guild.id)) {
                return interaction.editReply({
                    embeds: [
                        client.ErrorEmbed('此伺服器尚未設定動態語音頻道系統！', "未設定")
                    ],
                    ephemeral: true
                });
            }

            const settings = client.dynamicVoice.get(interaction.guild.id);
            const controlChannel = interaction.guild.channels.cache.get(settings.controlChannelId);
            const category = settings.categoryId ? interaction.guild.channels.cache.get(settings.categoryId) : null;

            const statusEmbed = client.MusicEmbed("🎤 動態語音頻道狀態")
                .addFields([
                    {
                        name: '🚪 進入頻道',
                        value: controlChannel ? `${controlChannel}` : '頻道不存在',
                        inline: true
                    },
                    {
                        name: '📁 類別',
                        value: category ? `${category.name}` : '無',
                        inline: true
                    },
                    {
                        name: '📝 名稱模板',
                        value: `\`${settings.template}\``,
                        inline: true
                    },
                    {
                        name: '📊 已創建頻道數量',
                        value: `${settings.createdChannels.length} 個`,
                        inline: true
                    },
                    {
                        name: '🟢 系統狀態',
                        value: controlChannel ? '運行中' : '進入頻道遺失',
                        inline: true
                    }
                ]);

            return interaction.editReply({
                embeds: [statusEmbed],
                ephemeral: true
            });
        } else {
            // 未知指令
            return interaction.editReply({
                embeds: [
                    client.ErrorEmbed('未知指令！', "指令錯誤")
                ],
                ephemeral: true
            });
        }
    });

/**
 * 儲存動態語音頻道設定
 * @param {Object} client 
 */
function saveDynamicVoiceSettings(client) {
    // 確保 data 目錄存在
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const dynamicVoiceData = {};
    for (const [guildId, settings] of client.dynamicVoice) {
        dynamicVoiceData[guildId] = settings;
    }

    fs.writeFileSync(
        path.join(dataDir, 'dynamicVoice.json'),
        JSON.stringify(dynamicVoiceData, null, 2)
    );
}

/**
 * 載入動態語音頻道設定
 * @param {Object} client 
 */
function loadDynamicVoiceSettings(client) {
    if (!client.dynamicVoice) {
        client.dynamicVoice = new Map();
    }

    // 確保 data 目錄存在
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('[動態語音] 已創建資料目錄');
    }

    const dataPath = path.join(dataDir, 'dynamicVoice.json');
    if (fs.existsSync(dataPath)) {
        try {
            const savedData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            for (const [guildId, settings] of Object.entries(savedData)) {
                client.dynamicVoice.set(guildId, settings);
            }
            console.log(`[動態語音] 已載入 ${client.dynamicVoice.size} 個伺服器設定`);
            // 設置事件監聽器
            setupEventListener(client);
            return true;
        } catch (err) {
            console.error('[動態語音] 載入設定檔時發生錯誤:', err);
            return false;
        }
    } else {
        console.log('[動態語音] 沒有找到設定檔');
        return false;
    }
}

/**
 * 設置事件監聽器
 * @param {Object} client 
 */
function setupEventListener(client) {
    // 避免重複設置
    if (client.dynamicVoiceListenerSetup) {
        console.log('[動態語音] 事件監聽器已存在，跳過設置');
        return;
    }

    client.dynamicVoiceListenerSetup = true;
    console.log('[動態語音] 設置事件監聽器');

    client.on('voiceStateUpdate', async (oldState, newState) => {
        try {
            // 如果沒有設定、使用者是機器人則跳過
            if (!client.dynamicVoice || !newState.member || newState.member.user.bot) return;

            const guildId = newState.guild.id;
            if (!client.dynamicVoice.has(guildId)) return;

            const settings = client.dynamicVoice.get(guildId);
            if (!settings) return;

            // 1. 使用者進入控制頻道時自動創建頻道
            if (newState.channelId === settings.controlChannelId) {
                const user = newState.member;

                // 建立頻道名稱
                const channelName = settings.template
                    .replace('{username}', user.user.username)
                    .replace('{user}', user.user.username)
                    .replace('{number}', (settings.createdChannels.length + 1).toString());

                try {
                    // 建立新頻道
                    const newChannel = await newState.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildVoice,
                        parent: settings.categoryId ? settings.categoryId : null,
                        permissionOverwrites: [
                            {
                                id: newState.guild.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
                            },
                            {
                                id: user.id,
                                allow: [
                                    PermissionFlagsBits.ManageChannels,
                                    PermissionFlagsBits.MuteMembers,
                                    PermissionFlagsBits.MoveMembers
                                ]
                            }
                        ]
                    });

                    // 將使用者移動到新頻道
                    await user.voice.setChannel(newChannel).catch(() => {});

                    // 將新建頻道加入清單
                    settings.createdChannels.push(newChannel.id);
                    client.dynamicVoice.set(guildId, settings);
                    saveDynamicVoiceSettings(client);

                    // 記錄到控制台
                    console.log(
                        `伺服器 ${guildId} | [動態語音] ${user.user.username} 建立了頻道 ${newChannel.name}`
                    );

                    // 發送控制面板到新頻道（如果使用者在新頻道的話）
                    try {
                        // 如果需要可以發送基本的歡迎訊息
                        await newChannel.send({
                            embeds: [
                                client.MusicEmbed("🎉 歡迎")
                                    .setDescription(`${user} 歡迎來到你的專屬語音頻道 **${newChannel.name}**！\n\n你可以使用 \`/play\` 指令播放音樂。`)
                            ],
                            components: createVoiceChannelController(user.id)
                        });
                    } catch (error) {
                        console.error('發送歡迎訊息到語音頻道時出錯:', error);
                    }
                } catch (error) {
                    console.error('建立動態語音頻道時發生錯誤:', error);
                }
            }

            // 2. 使用者離開頻道時檢查是否要刪除空頻道
            if (oldState.channelId && settings.createdChannels && settings.createdChannels.includes(oldState.channelId)) {
                const channel = oldState.guild.channels.cache.get(oldState.channelId);
                if (channel && channel.members.size === 0) {
                    // 等待一段時間再檢查使用者是否真的離開
                    setTimeout(async () => {
                        const currentChannel = oldState.guild.channels.cache.get(oldState.channelId);
                        if (currentChannel && currentChannel.members.size === 0) {
                            await currentChannel.delete().catch(() => {});

                            // 更新清單
                            const currentSettings = client.dynamicVoice.get(guildId);
                            if (currentSettings) {
                                currentSettings.createdChannels = currentSettings.createdChannels.filter(
                                    id => id !== oldState.channelId
                                );
                                client.dynamicVoice.set(guildId, currentSettings);
                                saveDynamicVoiceSettings(client);

                                console.log(
                                    `伺服器 ${guildId} | [動態語音] 刪除了空頻道 ${channel.name}`
                                );
                            }
                        }
                    }, 5000); // 5秒延遲，避免頻繁創建刪除
                }
            }
        } catch (error) {
            console.error('[動態語音] 處理語音狀態更新時發生錯誤:', error);
        }
    });
}

/**
 * 建立語音頻道控制面板
 * @param {string} ownerId 擁有者ID
 * @returns {ActionRowBuilder} 控制面板組件
 */
function createVoiceChannelController(ownerId) {
    // 建立下拉選單
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`voice_control_${ownerId}`)
        .setPlaceholder('選擇管理功能')
        .addOptions([
            {
                label: '修改名稱',
                description: '變更動態語音頻道名稱',
                value: 'rename_channel',
                emoji: '✏️'
            },
            {
                label: '封鎖使用者',
                description: '禁止特定使用者進入頻道',
                value: 'block_user',
                emoji: '🚫'
            },
            {
                label: '解除封鎖',
                description: '允許被封鎖的使用者重新進入',
                value: 'unblock_user',
                emoji: '✅'
            },
            {
                label: '邀請使用者',
                description: '邀請特定使用者加入頻道',
                value: 'invite_user',
                emoji: '📨'
            },
            {
                label: '鎖定頻道',
                description: '設為私人頻道，僅邀請使用者可進入',
                value: 'lock_channel',
                emoji: '🔒'
            },
            {
                label: '解鎖頻道',
                description: '開放頻道，所有人可進入',
                value: 'unlock_channel',
                emoji: '🔓'
            },
            {
                label: '轉移頻道所有權',
                description: '將頻道所有權轉移給其他使用者',
                value: 'transfer_ownership',
                emoji: '👑'
            },
            {
                label: '頻道設定',
                description: '調整詳細設定',
                value: 'channel_settings',
                emoji: '⚙️'
            }
        ]);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    // 建立快捷按鈕
    const quickButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`voice_quick_lock_${ownerId}`)
                .setLabel('快速鎖定')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`voice_quick_unlock_${ownerId}`)
                .setLabel('快速解鎖')
                .setEmoji('🔓')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`voice_quick_rename_${ownerId}`)
                .setLabel('重新命名')
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`voice_quick_settings_${ownerId}`)
                .setLabel('設定')
                .setEmoji('⚙️')
                .setStyle(ButtonStyle.Secondary)
        );

    return [selectRow, quickButtons];
}

module.exports = command;

// 導出輔助函數，讓其他檔案可以使用
module.exports.setupEventListener = setupEventListener;
module.exports.saveDynamicVoiceSettings = saveDynamicVoiceSettings;
module.exports.loadDynamicVoiceSettings = loadDynamicVoiceSettings;
const colors = require("colors");
const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");
const fs = require('fs');
const path = require('path');

const command = new SlashCommand()
  .setName("dynamicvoice")
  .setDescription("設定動態語音頻道系統")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("setup")
      .setDescription("設定一個動態語音頻道")
      .addStringOption((option) =>
        option
          .setName("名稱")
          .setDescription("創建的頻道名稱模板，可使用 {username} 作為使用者名稱")
          .setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName("類別")
          .setDescription("放置動態頻道的類別")
          .setRequired(false)
      )
      .addStringOption((option) =>
        option
          .setName("頻道")
          .setDescription("設置動態頻道的頻道")
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("disable").setDescription("停用動態語音頻道系統")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("status").setDescription("查看當前動態語音頻道設定狀態")
  )
  .setRun(async (client, interaction) => {
    // 檢查權限
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        embeds: [
          client.ErrorEmbed("你沒有管理頻道的權限!", "權限不足")
        ],
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();

    // 確保資料結構存在
    if (!client.dynamicVoice) {
      client.dynamicVoice = new Map();
    }
    
    // 只在第一次時設置事件監聽器
    if (!client.dynamicVoiceListenerSetup) {
      setupEventListener(client);
    }

    if (subcommand === 'setup') {
      const template = interaction.options.getString('名稱') || '{username} 的頻道';
      const category = interaction.options.getChannel('類別');
      const entryChannel = interaction.options.getChannel('入口頻道');
      const entryName = interaction.options.getString('入口名稱') || '➕ 加入以創建語音';

      try {
        let controlChannel;
        
        if (entryChannel) {
          // 使用選擇的現有頻道
          if (entryChannel.type !== ChannelType.GuildVoice) {
            return interaction.reply({
              embeds: [
                client.ErrorEmbed("選擇的頻道必須是語音頻道", "頻道類型錯誤")
              ],
              ephemeral: true
            });
          }
          controlChannel = entryChannel;
        } else {
          // 創建新的控制頻道
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
          isCreatedByBot: !entryChannel // 標記是否由機器人創建
        });

        // 儲存到硬碟
        saveDynamicVoiceSettings(client);

        console.log(
          `伺服器: ${interaction.guild.id} | [動態語音] 已設定在 ${interaction.guild.name}`
        );

        return interaction.reply({
          embeds: [
            client.SuccessEmbed(
              `已設定控制頻道 ${controlChannel}。\n當成員加入此頻道時，將自動創建新的語音頻道。`,
              "🔊 動態語音頻道已設定"
            )
          ]
        });
      } catch (error) {
        console.error('設定動態語音頻道時發生錯誤:', error);
        return interaction.reply({
          embeds: [
            client.ErrorEmbed(`設定過程中發生錯誤: ${error.message}`, "設定失敗")
          ],
          ephemeral: true
        });
      }
    } else if (subcommand === 'disable') {
      if (!client.dynamicVoice || !client.dynamicVoice.has(interaction.guild.id)) {
        return interaction.reply({
          embeds: [
            client.ErrorEmbed('此伺服器尚未設定動態語音頻道!', "未設定")
          ],
          ephemeral: true
        });
      }

      try {
        const settings = client.dynamicVoice.get(interaction.guild.id);

        // 刪除控制頻道（只有在我們創建的情況下才刪除）
        const controlChannel = interaction.guild.channels.cache.get(settings.controlChannelId);
        if (controlChannel && settings.isCreatedByBot) {
          await controlChannel.delete();
        }

        // 刪除所有已創建的頻道
        for (const channelId of settings.createdChannels) {
          const channel = interaction.guild.channels.cache.get(channelId);
          if (channel) await channel.delete().catch(() => {});
        }

        // 刪除設定
        client.dynamicVoice.delete(interaction.guild.id);
        saveDynamicVoiceSettings(client);

        console.log(
          `伺服器: ${interaction.guild.id} | [動態語音] 已停用在 ${interaction.guild.name}`
        );

        return interaction.reply({
          embeds: [
            client.SuccessEmbed('動態語音頻道系統已成功停用。', "🔊 動態語音頻道已停用")
          ]
        });
      } catch (error) {
        console.error('停用動態語音頻道時發生錯誤:', error);
        return interaction.reply({
          embeds: [
            client.ErrorEmbed(`停用過程中發生錯誤: ${error.message}`, "停用失敗")
          ],
          ephemeral: true
        });
      }
    } else if (subcommand === 'status') {
      if (!client.dynamicVoice || !client.dynamicVoice.has(interaction.guild.id)) {
        return interaction.reply({
          embeds: [
            client.ErrorEmbed('此伺服器尚未設定動態語音頻道系統', "未設定")
          ],
          ephemeral: true
        });
      }

      const settings = client.dynamicVoice.get(interaction.guild.id);
      const controlChannel = interaction.guild.channels.cache.get(settings.controlChannelId);
      const category = settings.categoryId ? interaction.guild.channels.cache.get(settings.categoryId) : null;

      const statusEmbed = client.MusicEmbed("動態語音頻道狀態")
        .addFields([
          {
            name: '🚪 入口頻道',
            value: controlChannel ? `${controlChannel}` : '頻道不存在',
            inline: true
          },
          {
            name: '📁 類別',
            value: category ? `${category.name}` : '無類別',
            inline: true
          },
          {
            name: '📝 頻道名稱模板',
            value: `\`${settings.template}\``,
            inline: true
          },
          {
            name: '📊 已創建頻道數量',
            value: `${settings.createdChannels.length} 個`,
            inline: true
          },
          {
            name: '🔧 系統狀態',
            value: controlChannel ? '✅ 正常運行' : '❌ 入口頻道遺失',
            inline: true
          }
        ]);

      return interaction.reply({
        embeds: [statusEmbed],
        ephemeral: true
      });
    } else {
      // 未知的子指令
      return interaction.reply({
        embeds: [
          client.ErrorEmbed('未知的子指令', "指令錯誤")
        ],
        ephemeral: true
      });
    }
  });

/**
 * 保存動態語音頻道設定
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
      console.error('[動態語音] 載入設定檔時出錯:', err);
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
  // 避免重複設置監聽器
  if (client.dynamicVoiceListenerSetup) {
    console.log('[動態語音] 事件監聽器已存在，跳過設置');
    return;
  }
  
  client.dynamicVoiceListenerSetup = true;
  console.log('[動態語音] 設置事件監聽器');
  
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      // 如果沒有設定或用戶是機器人則跳過
      if (!client.dynamicVoice || !newState.member || newState.member.user.bot) return;
      
      const guildId = newState.guild.id;
      if (!client.dynamicVoice.has(guildId)) return;
      
      const settings = client.dynamicVoice.get(guildId);
      if (!settings) return;
      
      // 1. 處理用戶加入控制頻道的情況
      if (newState.channelId === settings.controlChannelId) {
        const user = newState.member;
        
        // 建立新的頻道名稱
        const channelName = settings.template
          .replace('{username}', user.user.username)
          .replace('{user}', user.user.username)
          .replace('{number}', (settings.createdChannels.length + 1).toString());
        
        try {
          // 創建新頻道
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
                allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.MoveMembers]
              }
            ]
          });
          
          // 將用戶移動到新頻道
          await user.voice.setChannel(newChannel).catch(() => {});
          
          // 更新創建的頻道列表
          settings.createdChannels.push(newChannel.id);
          client.dynamicVoice.set(guildId, settings);
          saveDynamicVoiceSettings(client);

          // 記錄到控制台
          console.log(
            `伺服器: ${guildId} | [動態語音] 為 ${user.user.username} 創建了頻道 ${newChannel.name}`
          );
          
          // 發送控制面板到文字頻道（如果機器人有權限的話）
          try {
            // 如果沒有音樂播放器，發送基本歡迎訊息
            await newChannel.send({
              embeds: [
                client.MusicEmbed("歡迎")
                  .setDescription(`${user} 歡迎來到您的專屬語音頻道 **${newChannel.name}**！\n\n您可以使用 \`/play\` 指令開始播放音樂。`)
              ],
              components: createVoiceChannelController(user.id)
            });
          } catch (error) {
            console.error('發送歡迎訊息到語音頻道時出錯:', error);
          }
        } catch (error) {
          console.error('創建動態語音頻道時發生錯誤:', error);
        }
      }
      
      // 2. 當用戶離開頻道，檢查是否需要刪除空頻道
      if (oldState.channelId && 
          settings.createdChannels && 
          settings.createdChannels.includes(oldState.channelId)) {
        
        const channel = oldState.guild.channels.cache.get(oldState.channelId);
        if (channel && channel.members.size === 0) {
          // 等待短暫時間再檢查，避免用戶只是暫時離開
          setTimeout(async () => {
            const currentChannel = oldState.guild.channels.cache.get(oldState.channelId);
            if (currentChannel && currentChannel.members.size === 0) {
              await currentChannel.delete().catch(() => {});
              
              // 更新動態頻道列表
              const currentSettings = client.dynamicVoice.get(guildId);
              if (currentSettings) {
                currentSettings.createdChannels = currentSettings.createdChannels.filter(
                  id => id !== oldState.channelId
                );
                client.dynamicVoice.set(guildId, currentSettings);
                saveDynamicVoiceSettings(client);
                
                console.log(
                  `伺服器: ${guildId} | [動態語音] 刪除了空頻道 ${channel.name}`
                );
              }
            }
          }, 5000); // 5秒延遲，避免頻繁的頻道創建和刪除
        }
      }
    } catch (error) {
      console.error('[動態語音] 處理語音狀態更新時出錯:', error);
    }
  });
}

/**
 * 創建語音頻道控制面板
 * @param {string} ownerId 頻道擁有者ID
 * @returns {ActionRowBuilder} 控制面板組件
 */
function createVoiceChannelController(ownerId) {
  const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  
  // 創建下拉選單
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`voice_control_${ownerId}`)
    .setPlaceholder('🎛️ 選擇頻道管理功能')
    .addOptions([
      {
        label: '修改頻道名稱',
        description: '變更您的語音頻道名稱',
        value: 'rename_channel',
        emoji: '🏷️'
      },
      {
        label: '封鎖用戶',
        description: '禁止特定用戶加入您的頻道',
        value: 'block_user',
        emoji: '🚫'
      },
      {
        label: '解除封鎖',
        description: '允許被封鎖的用戶重新加入',
        value: 'unblock_user',
        emoji: '✅'
      },
      {
        label: '邀請用戶',
        description: '邀請特定用戶加入頻道',
        value: 'invite_user',
        emoji: '👥'
      },
      {
        label: '鎖定頻道',
        description: '設為私人頻道，僅邀請用戶可加入',
        value: 'lock_channel',
        emoji: '🔒'
      },
      {
        label: '解鎖頻道',
        description: '開放頻道，所有人都可加入',
        value: 'unlock_channel',
        emoji: '🔓'
      },
      {
        label: '轉移所有權',
        description: '將頻道所有權轉移給其他用戶',
        value: 'transfer_ownership',
        emoji: '👑'
      },
      {
        label: '頻道設定',
        description: '調整頻道的詳細設定',
        value: 'channel_settings',
        emoji: '⚙️'
      }
    ]);

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);
  
  // 創建快捷按鈕
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
        .setEmoji('🏷️')
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
// 導出 setupEventListener 函數，讓其他文件可以使用
module.exports.setupEventListener = setupEventListener;
module.exports.saveDynamicVoiceSettings = saveDynamicVoiceSettings;
module.exports.loadDynamicVoiceSettings = loadDynamicVoiceSettings; 
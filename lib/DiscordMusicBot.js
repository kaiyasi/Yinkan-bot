const {
  Client,
  Intents,
  EmbedBuilder,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
} = require("discord.js");
const { escapeMarkdown } = require("discord.js");
const fs = require("fs");
const path = require("path");
let prettyMs;
let jsoning;

(async () => {
    prettyMs = (await import('pretty-ms')).default;
    jsoning = (await import('jsoning')).default;
})();

const { Player } = require("discord-player");
const ConfigFetcher = require("../util/getConfig");
const Logger = require("./Logger");
const Server = require("../api");
const getLavalink = require("../util/getLavalink");
const getChannel = require("../util/getChannel");
const colors = require("colors");

class DiscordMusicBot extends Client {
  /**
   * Create the music client
   * @param {import("discord.js").ClientOptions} props - Client options
   */
  constructor(
    props = {
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MESSAGES,
      ],
    }
  ) {
    super(props);

    ConfigFetcher().then((conf) => {
      this.config = conf;
      this.build();
    });

    //Load Events and stuff
    /**@type {Collection<string, import("./SlashCommand")} */
    this.slashCommands = new Collection();
    this.contextCommands = new Collection();

    this.logger = new Logger(path.join(__dirname, "..", "logs.log"));

    this.LoadCommands();
    this.LoadEvents();

    this.database = new jsoning("db.json");

    this.deletedMessages = new WeakSet();
    this.getLavalink = getLavalink;
    this.getChannel = getChannel;
    this.ms = prettyMs;
    this.commandsRan = 0;
    this.songsPlayed = 0;
  }

  /**
   * Send an info message
   * @param {string} text
   */
  log(text) {
    this.logger.log(text);
  }

  /**
   * Send an warning message
   * @param {string} text
   */
  warn(text) {
    this.logger.warn(text);
  }

  /**
   * Send an error message
   * @param {string} text
   */
  error(text) {
    this.logger.error(text);
  }

  /**
   * Build em
   */
  build() {
    this.warn("Started the bot...");
    this.login(this.config.token);
    this.server = this.config.website?.length ? new Server(this) : null;
    if (this.config.debug === true) {
      this.warn("Debug mode is enabled!");
      this.warn("Only enable this if you know what you are doing!");
      process.on("unhandledRejection", (error) => console.log(error));
      process.on("uncaughtException", (error) => console.log(error));
    } else {
      process.on("unhandledRejection", (error) => {
        return;
      });
      process.on("uncaughtException", (error) => {
        return;
      });
    }

    let client = this;

    // 初始化 Discord Player
    this.player = new Player(this);
    this.player.extractors.loadDefault();

    // Discord Player 事件
    this.player.events.on('playerStart', (queue, track) => {
          this.songsPlayed++;
      this.warn(`Track has been started playing [${colors.blue(track.title)}]`);
      
          let trackStartedEmbed = this.Embed()
            .setAuthor({ name: "Now playing", iconURL: this.config.iconURL })
        .setDescription(`[${escapeMarkdown(track.title)}](${track.url})` || "No Descriptions")
            .addFields(
              {
                name: "Requested by",
            value: `${track.requestedBy || `<@${client.user.id}>`}`,
                inline: true,
              },
              {
                name: "Duration",
            value: track.duration ? `\`${track.duration}\`` : "`LIVE`",
                inline: true,
              }
            );
      
          try {
        trackStartedEmbed.setThumbnail(track.thumbnail);
          } catch (err) {
        // 無法設定縮圖時忽略錯誤
          }
      
      queue.metadata.send({
              embeds: [trackStartedEmbed],
        components: [client.createController(queue.guild.id, queue)],
      }).catch(this.warn);
    });

    this.player.events.on('audioTrackAdd', (queue, track) => {
      queue.metadata.send(`➕ 已添加到佇列: **${track.title}**`);
    });

    this.player.events.on('disconnect', (queue) => {
      queue.metadata.send('❌ 已從語音頻道斷開連接！');
            });

    this.player.events.on('emptyChannel', (queue) => {
      queue.metadata.send('📭 語音頻道為空，自動離開');
    });

    this.player.events.on('emptyQueue', (queue) => {
      queue.metadata.send('📭 播放佇列已結束');
    });

    this.player.events.on('error', (queue, error) => {
      this.warn(`播放錯誤: ${error.message}`);
      queue.metadata.send(`❌ 發生錯誤: ${error.message}`);
    });
  }

  /**
   * Checks if a message has been deleted during the run time of the Bot
   * @param {Message} message
   * @returns
   */
  isMessageDeleted(message) {
    return this.deletedMessages.has(message);
  }

  /**
   * Marks (adds) a message on the client's `deletedMessages` WeakSet so it's
   * state can be seen through the code
   * @param {Message} message
   */
  markMessageAsDeleted(message) {
    this.deletedMessages.add(message);
  }

  /**
   *
   * @param {string} text
   * @returns {EmbedBuilder}
   */
  Embed(text) {
    let embed = new EmbedBuilder().setColor(this.config.embedColor);

    if (text) {
      embed.setDescription(text);
    }

    return embed;
  }

  /**
   *
   * @param {string} text
   * @returns {EmbedBuilder}
   */
  ErrorEmbed(text) {
    let embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("❌ | " + text);

    return embed;
  }

  LoadEvents() {
    let EventsDir = path.join(__dirname, "..", "events");
    fs.readdir(EventsDir, (err, files) => {
      if (err) {
        throw err;
      } else {
        files.forEach((file) => {
          const event = require(EventsDir + "/" + file);
          this.on(file.split(".")[0], event.bind(null, this));
          this.warn("Event Loaded: " + file.split(".")[0]);
        });
      }
    });
  }

  LoadCommands() {
    let SlashCommandsDirectory = path.join(
      __dirname,
      "..",
      "commands",
      "slash"
    );
    fs.readdir(SlashCommandsDirectory, (err, files) => {
      if (err) {
        throw err;
      } else {
        files.forEach((file) => {
          try {
          let cmd = require(SlashCommandsDirectory + "/" + file);

          if (!cmd || !cmd.run) {
            return this.warn(
              "Unable to load Command: " +
                file.split(".")[0] +
                ", File doesn't have an valid command with run function"
            );
          }
          this.slashCommands.set(file.split(".")[0].toLowerCase(), cmd);
          this.log("Slash Command Loaded: " + file.split(".")[0]);
          } catch (error) {
            this.warn(`Failed to load command ${file}: ${error.message}`);
          }
        });
      }
    });

    let ContextCommandsDirectory = path.join(
      __dirname,
      "..",
      "commands",
      "context"
    );
    fs.readdir(ContextCommandsDirectory, (err, files) => {
      if (err) {
        throw err;
      } else {
        files.forEach((file) => {
          try {
          let cmd = require(ContextCommandsDirectory + "/" + file);
          if (!cmd.command || !cmd.run) {
            return this.warn(
              "Unable to load Command: " +
                file.split(".")[0] +
                ", File doesn't have either command/run"
            );
          }
          this.contextCommands.set(file.split(".")[0].toLowerCase(), cmd);
          this.log("ContextMenu Loaded: " + file.split(".")[0]);
          } catch (error) {
            this.warn(`Failed to load context command ${file}: ${error.message}`);
          }
        });
      }
    });
  }

  /**
   *
   * @param {import("discord.js").TextChannel} textChannel
   * @param {import("discord.js").VoiceChannel} voiceChannel
   */
  createPlayer(textChannel, voiceChannel) {
    return this.player.nodes.create(textChannel.guild, {
      metadata: textChannel,
      selfDeaf: this.config.serverDeafen,
      volume: this.config.defaultVolume,
      leaveOnEmpty: this.config.autoLeave,
      leaveOnEmptyCooldown: this.config.disconnectTime,
    });
  }

  createController(guild, queue) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle("Danger")
        .setCustomId(`controller:${guild}:Stop`)
        .setEmoji("⏹️"),

      new ButtonBuilder()
        .setStyle("Primary")
        .setCustomId(`controller:${guild}:Replay`)
        .setEmoji("⏮️"),

      new ButtonBuilder()
        .setStyle(queue.node.isPlaying() ? "Primary" : "Danger")
        .setCustomId(`controller:${guild}:PlayAndPause`)
        .setEmoji(queue.node.isPlaying() ? "⏸️" : "▶️"),

      new ButtonBuilder()
        .setStyle("Primary")
        .setCustomId(`controller:${guild}:Next`)
        .setEmoji("⏭️"),

      new ButtonBuilder()
        .setStyle("Success")
        .setCustomId(`controller:${guild}:Loop`)
        .setEmoji("🔁")
    );
  }
}

module.exports = DiscordMusicBot;

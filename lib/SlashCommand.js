const { SlashCommandBuilder } = require("@discordjs/builders");

class SlashCommand {
	constructor() {
		this.data = new SlashCommandBuilder();
		this.run = null;
	}

	setName(name) {
		this.data.setName(name);
		return this;
	}

	setDescription(description) {
		this.data.setDescription(description);
		return this;
	}

	setCategory(category) {
		this.data.category = category;
		return this;
	}

	addStringOption(callback) {
		this.data.addStringOption(callback);
		return this;
	}

	addIntegerOption(callback) {
		this.data.addIntegerOption(callback);
		return this;
	}

	addNumberOption(callback) {
		this.data.addNumberOption(callback);
		return this;
	}

	addBooleanOption(callback) {
		this.data.addBooleanOption(callback);
		return this;
	}

	addUserOption(callback) {
		this.data.addUserOption(callback);
		return this;
	}

	addChannelOption(callback) {
		this.data.addChannelOption(callback);
		return this;
	}

	addRoleOption(callback) {
		this.data.addRoleOption(callback);
		return this;
	}

	addSubcommand(callback) {
		this.data.addSubcommand(callback);
		return this;
	}

	addSubcommandGroup(callback) {
		this.data.addSubcommandGroup(callback);
		return this;
	}

	setRun(callback) {
		this.run = callback;
		return this;
	}
	
	// 添加 setSelfDefer 方法以設置命令是否會自行處理延遲回應
	setSelfDefer(selfDefer) {
		this.selfDefer = selfDefer;
		return this;
	}

	// 添加 execute 方法以兼容 interactionCreate.js
	async execute(interaction, client) {
		if (this.run) {
			return await this.run(client, interaction, interaction.options);
		} else {
			throw new Error(`指令 ${this.data.name} 沒有設置運行函數`);
		}
	}
}

module.exports = SlashCommand;

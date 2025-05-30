const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const getConfig = require("../util/getConfig");
const LoadCommands = require("../util/loadCommands");

(async () => {
	const config = await getConfig();
	const rest = new REST({ version: "9" }).setToken(config.token);
	const loadedCommands = await LoadCommands().then((cmds) => {
		return [].concat(cmds.slash).concat(cmds.context);
	});
	
	// 將指令物件轉換為 JSON 格式
	const commands = loadedCommands.map(cmd => {
		if (cmd && cmd.data) {
			return cmd.data.toJSON();
		} else if (cmd && cmd.toJSON) {
			return cmd.toJSON();
		} else {
			console.warn('跳過無效的指令:', cmd);
			return null;
		}
	}).filter(cmd => cmd !== null);
	
	console.log(`Deploying ${commands.length} commands to global...`);
	await rest
		.put(Routes.applicationCommands(config.clientId), {
			body: commands,
		})
		.catch(console.log);
	console.log("Successfully deployed commands!");
})();

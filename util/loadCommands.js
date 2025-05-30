const { join } = require("path");
const fs = require("fs");

const LoadCommands = () => {
	return new Promise(async (resolve) => {
		let slash = await LoadDirectory("slash");
		let context = await LoadDirectory("context");
		
		resolve({ slash, context });
	});
};

const LoadDirectory = (dir) => {
	return new Promise((resolve) => {
		let commands = [];
		let CommandsDir = join(__dirname, "..", "commands", dir);
		
		// 檢查目錄是否存在
		if (!fs.existsSync(CommandsDir)) {
			console.log(`目錄 ${dir} 不存在，跳過載入`);
			return resolve(commands);
		}
		
		fs.readdir(CommandsDir, (err, files) => {
			if (err) {
				console.error(`無法讀取目錄 ${dir}:`, err);
				return resolve(commands);
			}
			
			for (const file of files) {
				try {
					let cmd = require(CommandsDir + "/" + file);
					if (!cmd || (dir == "context" && !cmd.command)) {
						console.log(
							"Unable to load Command: " +
							file.split(".")[0] +
							", File doesn't have either command",
						);
						continue;
					}
					if (dir == "context") {
						commands.push(cmd.command);
					} else {
						commands.push(cmd);
					}
				} catch (error) {
					console.error(`載入指令 ${file} 時發生錯誤:`, error);
				}
			}
			resolve(commands);
		});
	});
};

module.exports = LoadCommands;

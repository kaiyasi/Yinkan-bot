const fs = require('fs');
const path = require('path');

async function LoadCommands() {
    const slashCommands = [];
    
    const slashCommandsPath = path.join(__dirname, '..', 'commands', 'slash');
    
    if (fs.existsSync(slashCommandsPath)) {
        const commandFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            try {
                const filePath = path.join(slashCommandsPath, file);
                const command = require(filePath);
                
                if (command && (command.name || command.data?.name) && (command.run || command.execute)) {
                    slashCommands.push({
                        name: command.name || command.data.name,
                        description: command.data?.description || command.description || 'No description',
                        category: command.category || 'general'
                    });
                }
            } catch (error) {
                console.error(`Error loading command ${file}:`, error);
            }
        }
    }
    
    return {
        slash: slashCommands
    };
}

module.exports = LoadCommands;
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

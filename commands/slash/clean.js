const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName("clean")
    .setDescription("清理最多100條機器人訊息")
    .addIntegerOption((option) => 
        option
            .setName("數量")
            .setDescription("要刪除的訊息數量")
            .setMinValue(2)
            .setMaxValue(100)
            .setRequired(false)
    )
    .setSelfDefer(true) // 設置 selfDefer 屬性表示此指令需要延遲回應
    .setRun(async (client, interaction, options) => {
        await interaction.deferReply();
        
        let number = interaction.options.getInteger("數量");
        number = number && number < 100 ? ++number : 100;
        
        interaction.channel.messages.fetch({ 
            limit: number 
        }).then((messages) => {
            const botMessages = [];
            messages.filter(m => m.author.id === client.user.id).forEach(msg => botMessages.push(msg));
            
            // 移除當前回應訊息
            botMessages.shift();
            
            interaction.channel.bulkDelete(botMessages, true)
                .then(async deletedMessages => {
                    // 過濾被刪除的訊息
                    messages = messages.filter(msg => {
                        return !deletedMessages.some(deletedMsg => deletedMsg.id === msg.id);
                    });
                    
                    if (messages.size > 0) {
                        client.log(`清理刪除 [${messages.size}] 條超過14天的訊息`);
                        for (const msg of messages) {
                            await msg.delete();
                        }
                    }
                    
                    return interaction.editReply({
                        content: `✅ | 已刪除 ${deletedMessages.size} 條機器人訊息！`
                    }).catch(err => {
                        client.error(err);
                    });
                });
        }).catch((e) => {
            client.error(e);
            return interaction.editReply({
                content: "❌ | 刪除訊息時發生錯誤"
            });
        });
    });

module.exports = command;
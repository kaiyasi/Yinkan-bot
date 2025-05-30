module.exports = {
    name: "nodeConnect",
    async execute(node, client) {
        console.log(`Node "${node.options.identifier}" 已連接。`);
        
        // 設置機器人狀態
        client.user.setActivity('🎵 音樂播放中', { 
            type: 'LISTENING'
        });
    }
}; 
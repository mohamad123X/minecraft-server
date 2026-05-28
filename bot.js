const mineflayer = require('mineflayer');

// Retrieve arguments passed from server.js fork process
const serverIp = process.argv[2];
const port = parseInt(process.argv[3]);
const username = process.argv[4];

function createBot() {
    const bot = mineflayer.createBot({
        host: serverIp,
        port: port,
        username: username,
        version: false // Auto-detect server version
    });

    bot.on('login', () => {
        console.log(`[SUCCESS] Bot ${username} successfully logged into ${serverIp}`);
    });

    // Handle being kicked or disconnected
    bot.on('end', (reason) => {
        console.log(`[DISCONNECTED] Bot ${username} disconnected. Reason: ${reason}`);
        // Exit process - You can implement auto-reconnect logic here instead of exiting
        process.exit(1); 
    });

    bot.on('error', (err) => {
        console.error(`[ERROR] Bot ${username} encountered an error:`, err.message);
        process.exit(1);
    });
}

createBot();

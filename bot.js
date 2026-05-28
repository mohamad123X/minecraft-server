const mineflayer = require('mineflayer');

const serverIp = process.argv[2];
const port = parseInt(process.argv[3]);
const username = process.argv[4];

let bot;

function createBot() {
    bot = mineflayer.createBot({
        host: serverIp,
        port: port,
        username: username,
        version: false,
        viewDistance: "tiny"
    });

    bot.on('spawn', () => {
        console.log(`[BOT] ${username} joined ${serverIp}`);
    });

    bot.on('end', () => {
        console.log('[BOT] Reconnecting...');
        setTimeout(createBot, 10000);
    });

    bot.on('error', (err) => {
        console.error('[BOT ERROR]', err.message);
    });
}

// ✅ مهم: نخليه مرة واحدة فقط خارج الفنكشن
process.on('message', (packet) => {
    if (packet.type === 'send_chat' && bot) {
        try {
            bot.chat(packet.text);
            console.log(`[CHAT] ${packet.text}`);
        } catch (e) {
            console.log('[ERROR] Failed to send chat');
        }
    }
});

createBot();

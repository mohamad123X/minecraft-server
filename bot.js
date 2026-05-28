const mineflayer = require('mineflayer');

const serverIp = process.argv[2];
const port = parseInt(process.argv[3]);
const username = process.argv[4];

function createBot() {
    const bot = mineflayer.createBot({
        host: serverIp,
        port: port,
        username: username,
        version: false,
        viewDistance: "tiny"
    });

    // الاستماع للرسائل المرسلة من خادم Express (اللوحة)
    process.on('message', (packet) => {
        if (packet.type === 'send_chat' && bot) {
            // تنفيذ الرسالة أو الأمر (إذا بدأت بـ / سيفهمها السيرفر كأمر تلقائياً)
            bot.chat(packet.text); 
            console.log(`[CONSOLE ACTION] Executed: ${packet.text}`);
        }
    });

    bot.on('end', (reason) => {
        bot.removeAllListeners();
        process.removeAllListeners(); // تنظيف المستمعين لمنع تسريب الذاكرة
        setTimeout(createBot, 15000);
    });

    bot.on('error', (err) => { console.error(err); });
}

createBot();

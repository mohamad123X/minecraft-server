const mineflayer = require('mineflayer');

const serverIp = process.argv[2];
const port = parseInt(process.argv[3]);
const username = process.argv[4];

function createBot() {
    console.log(`[INFO] Connecting bot ${username} to ${serverIp}:${port}...`);
    
    const bot = mineflayer.createBot({
        host: serverIp,
        port: port,
        username: username,
        version: false
    });

    bot.on('login', () => {
        console.log(`[SUCCESS] Bot ${username} successfully logged in!`);
    });

    // عند طرد البوت أو انقطاع الاتصال
    bot.on('end', (reason) => {
        console.log(`[DISCONNECTED] Bot ${username} disconnected. Reason: ${reason}`);
        console.log(`[RECONNECT] Attempting to reconnect ${username} in 15 seconds...`);
        
        // مسح الأحداث القديمة لتجنب تكرار العمليات واستهلاك الذاكرة
        bot.removeAllListeners();
        
        // إعادة الاتصال بعد 15 ثانية
        setTimeout(createBot, 15000);
    });

    bot.on('error', (err) => {
        console.error(`[ERROR] Bot ${username} error:`, err.message);
        // الأخطاء الخطيرة ستؤدي إلى إغلاق البوت ليقوم Railway أو server.js بتنظيفه
        if (err.code === 'ECONNREFUSED') {
            bot.quit();
        }
    });
}

// بدء التشغيل
createBot();

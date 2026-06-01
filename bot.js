const mineflayer = require('mineflayer');

const botsStatus = {};
const activeBots = {}; 
// كائن لتخزين فترات الإعلان التلقائي لتنظيفها لاحقاً
const broadcastIntervals = {}; 

function createBot(options, retries = 0) {
    if (activeBots[options.username] && botsStatus[options.username].status === '🟢 متصل (Online)') {
        console.log(`[!] البوت ${options.username} متصل بالفعل.`);
        return;
    }

    const maxRetries = 5;
    // تجهيز الهيكل الأساسي لحالة البوت بما فيها الإحداثيات والشات
    botsStatus[options.username] = { 
        status: '⏳ جاري الاتصال...', 
        reason: '',
        coords: { x: 0, y: 0, z: 0 },
        chatLogs: [] 
    };

    const bot = mineflayer.createBot({
        host: options.ip,
        port: parseInt(options.port) || 25565,
        username: options.username,
        version: options.version || false
    });

    activeBots[options.username] = bot;

    // حدث الدخول الناجح
    bot.on('spawn', () => {
        console.log(`[+] البوت ${options.username} دخل السيرفر.`);
        botsStatus[options.username].status = '🟢 متصل (Online)';
        botsStatus[options.username].reason = 'يعمل بشكل سليم';
        retries = 0;

        // تنفيذ أمر تسجيل الدخول إذا وُجد
        if (options.authCommand) {
            setTimeout(() => {
                bot.chat(options.authCommand);
            }, 2000);
        }

        // تفعيل ميزة المعلن التلقائي (Auto-Broadcast) إذا تم تفعيلها من الواجهة
        if (options.broadcastMessage && options.broadcastInterval) {
            // تنظيف أي موقت قديم لنفس البوت احتياطاً
            if (broadcastIntervals[options.username]) clearInterval(broadcastIntervals[options.username]);
            
            const intervalMs = parseInt(options.broadcastInterval) * 1000; // تحويل إلى ميلي ثانية
            broadcastIntervals[options.username] = setInterval(() => {
                if (activeBots[options.username]) {
                    bot.chat(options.broadcastMessage);
                    console.log(`[*] [${options.username}] تم إرسال الإعلان التلقائي.`);
                }
            }, intervalMs);
        }
    });

    // تحديث الإحداثيات حية عند تحرك البوت
    bot.on('move', () => {
        if (bot.entity && bot.entity.position) {
            botsStatus[options.username].coords = {
                x: Math.round(bot.entity.position.x),
                y: Math.round(bot.entity.position.y),
                z: Math.round(bot.entity.position.z)
            };
        }
    });

    // استقبال شات السيرفر وحفظ آخر 15 رسالة فقط (Live Chat Viewer)
    bot.on('message', (jsonMsg) => {
        const plainText = jsonMsg.toString().trim();
        if (plainText) {
            const logs = botsStatus[options.username].chatLogs;
            logs.push(plainText);
            if (logs.length > 15) logs.shift(); // حذف الرسائل القديمة للحفاظ على الذاكرة
        }
    });

    // دالة تنظيف الموارد عند الانفصال
    function cleanUpBot(username) {
        delete activeBots[username];
        if (broadcastIntervals[username]) {
            clearInterval(broadcastIntervals[username]);
            delete broadcastIntervals[username];
        }
    }

    bot.on('kicked', (reason) => {
        let kickReason = typeof reason === 'object' ? JSON.stringify(reason) : String(reason);
        botsStatus[options.username].status = '🔴 تم الطرد (Kicked)';
        botsStatus[options.username].reason = kickReason;
        cleanUpBot(options.username);
    });

    bot.on('end', (reason) => {
        let endReason = String(reason);
        cleanUpBot(options.username);
        
        if (botsStatus[options.username].status !== '🔴 تم الطرد (Kicked)') {
            botsStatus[options.username].status = '⚫ غير متصل (Offline)';
            botsStatus[options.username].reason = endReason;

            if (retries < maxRetries) {
                const delay = 15000 + (retries * 5000);
                setTimeout(() => createBot(options, retries + 1), delay);
            } else {
                botsStatus[options.username].status = '❌ تم الإيقاف';
                botsStatus[options.username].reason = 'تم تجاوز حد محاولات إعادة الاتصال';
            }
        }
    });

    bot.on('error', (err) => {
        botsStatus[options.username].status = '❌ خطأ برمجي';
        botsStatus[options.username].reason = err.message;
        cleanUpBot(options.username);
    });

    return bot;
}

module.exports = { createBot, botsStatus, activeBots };

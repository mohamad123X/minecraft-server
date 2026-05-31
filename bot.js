const mineflayer = require('mineflayer');

// كائن عالمي لتخزين حالة البوتات لكي تقرأها مدونة Blogger
const botsStatus = {};

function createBot(options) {
    // تعيين الحالة المبدئية
    botsStatus[options.username] = { status: '⏳ جاري الاتصال...', reason: '' };

    const bot = mineflayer.createBot({
        host: options.ip,
        port: options.port || 25565,
        username: options.username,
        version: options.version
    });

    // حدث الدخول الناجح
    bot.on('spawn', () => {
        console.log(`[+] البوت ${options.username} دخل السيرفر.`);
        botsStatus[options.username].status = '🟢 متصل (Online)';
        botsStatus[options.username].reason = 'يعمل بشكل سليم';

        // حل مشكلة الطرد بعد 3 ثوانٍ: إرسال أمر تسجيل الدخول إذا تم إدخاله في المدونة
        if (options.authCommand) {
            setTimeout(() => {
                bot.chat(options.authCommand);
                console.log(`[*] تم إرسال أمر تسجيل الدخول للبوت ${options.username}`);
            }, 1000); // الانتظار ثانية واحدة بعد الدخول لضمان استقرار البوت
        }
    });

    // حدث الطرد المتعمد من السيرفر (مثل AuthMe أو Anti-Bot)
    bot.on('kicked', (reason) => {
        // تحويل سبب الطرد إلى نص مقروء
        let kickReason = typeof reason === 'object' ? JSON.stringify(reason) : String(reason);
        console.log(`[-] تم طرد البوت ${options.username}. السبب: ${kickReason}`);
        
        botsStatus[options.username].status = '🔴 تم الطرد (Kicked)';
        botsStatus[options.username].reason = kickReason;
    });

    // حدث انقطاع الاتصال
    bot.on('end', (reason) => {
        let endReason = String(reason);
        console.log(`[-] انقطع اتصال ${options.username}. السبب: ${endReason}`);
        
        if (botsStatus[options.username].status !== '🔴 تم الطرد (Kicked)') {
            botsStatus[options.username].status = '⚫ غير متصل (Offline)';
            botsStatus[options.username].reason = endReason;
        }

        // إعادة الاتصال بعد 15 ثانية لمنع الضغط على السيرفر (لتجنب حظر الـ IP)
        setTimeout(() => createBot(options), 15000);
    });

    bot.on('error', (err) => {
        console.log(`[x] خطأ في ${options.username}:`, err);
        botsStatus[options.username].status = '❌ خطأ برمجي';
        botsStatus[options.username].reason = err.message;
    });

    return bot;
}

module.exports = { createBot, botsStatus };

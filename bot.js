// استدعاء مكتبة mineflayer لبناء البوت
const mineflayer = require('mineflayer');

// دالة تصدير البوت ليمكن استدعاؤها من السيرفر الأساسي
function createBot(options) {
    const bot = mineflayer.createBot({
        host: options.ip,       // اي بي سيرفر ماين كرافت
        port: options.port || 25565, // البورت (الافتراضي 25565)
        username: options.username,  // اسم البوت
        version: options.version // إصدار اللعبة (مثل 1.16.5 أو 1.20)
    });

    // حدث: عند نجاح دخول البوت للسيرفر
    bot.on('spawn', () => {
        console.log(`[+] البوت ${options.username} دخل السيرفر بنجاح!`);
    });

    // حدث: عند طرد البوت أو انقطاع الاتصال (لضمان بقائه 24/7)
    bot.on('end', (reason) => {
        console.log(`[-] انقطع اتصال البوت ${options.username}. السبب: ${reason}`);
        console.log('جاري محاولة إعادة الاتصال بعد 10 ثوانٍ...');
        // إعادة تشغيل البوت تلقائياً بعد 10 ثوانٍ
        setTimeout(() => createBot(options), 10000);
    });

    // حدث: تسجيل الأخطاء لمنع توقف الخادم بالكامل
    bot.on('error', (err) => {
        console.log(`[x] خطأ في البوت ${options.username}:`, err);
    });

    return bot;
}

module.exports = { createBot };

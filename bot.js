const mineflayer = require('mineflayer');

// كائن عالمي لتخزين حالة البوتات
const botsStatus = {};
// كائن جديد لتخزين البوتات النشطة ومنع تشغيل نسخ متكررة في الذاكرة
const activeBots = {}; 

function createBot(options, retries = 0) {
    // 1. الحماية من التكرار: إذا كان البوت يعمل مسبقاً، تجاهل الطلب
    if (activeBots[options.username] && botsStatus[options.username].status === '🟢 متصل (Online)') {
        console.log(`[!] البوت ${options.username} متصل بالفعل.`);
        return;
    }

    const maxRetries = 5; // أقصى عدد لمحاولات إعادة الاتصال لحماية سيرفر Railway

    // تعيين الحالة المبدئية
    botsStatus[options.username] = { status: '⏳ جاري الاتصال...', reason: '' };

    const bot = mineflayer.createBot({
        host: options.ip,
        port: options.port || 25565,
        username: options.username,
        version: options.version
    });

    activeBots[options.username] = bot; // حفظ البوت في الذاكرة للتحكم به لاحقاً

    // حدث الدخول الناجح
    bot.on('spawn', () => {
        console.log(`[+] البوت ${options.username} دخل السيرفر.`);
        botsStatus[options.username].status = '🟢 متصل (Online)';
        botsStatus[options.username].reason = 'يعمل بشكل سليم';
        retries = 0; // تصفير عداد المحاولات عند الدخول بنجاح

        if (options.authCommand) {
            setTimeout(() => {
                bot.chat(options.authCommand);
                console.log(`[*] تم إرسال أمر تسجيل الدخول للبوت ${options.username}`);
            }, 2000); // زدنا الوقت إلى ثانيتين لضمان استقرار البوت في السيرفر قبل الكتابة
        }
    });

    // حدث الطرد المتعمد من السيرفر
    bot.on('kicked', (reason) => {
        let kickReason = typeof reason === 'object' ? JSON.stringify(reason) : String(reason);
        console.log(`[-] تم طرد البوت ${options.username}. السبب: ${kickReason}`);
        
        botsStatus[options.username].status = '🔴 تم الطرد (Kicked)';
        botsStatus[options.username].reason = kickReason;
        delete activeBots[options.username]; // تفريغ الذاكرة
    });

    // حدث انقطاع الاتصال
    bot.on('end', (reason) => {
        let endReason = String(reason);
        console.log(`[-] انقطع اتصال ${options.username}. السبب: ${endReason}`);
        delete activeBots[options.username]; // تفريغ الذاكرة لمنع الـ Memory Leak
        
        if (botsStatus[options.username].status !== '🔴 تم الطرد (Kicked)') {
            botsStatus[options.username].status = '⚫ غير متصل (Offline)';
            botsStatus[options.username].reason = endReason;

            // 2. نظام إعادة الاتصال الذكي
            if (retries < maxRetries) {
                // زيادة وقت الانتظار تدريجياً: 15ث -> 20ث -> 25ث...
                const delay = 15000 + (retries * 5000); 
                console.log(`[*] محاولة إعادة الاتصال (${retries + 1}/${maxRetries}) بعد ${delay/1000} ثانية...`);
                setTimeout(() => createBot(options, retries + 1), delay);
            } else {
                // التوقف النهائي لحماية Railway
                botsStatus[options.username].status = '❌ تم الإيقاف';
                botsStatus[options.username].reason = 'تم تجاوز الحد الأقصى لمحاولات إعادة الاتصال';
                console.log(`[x] إيقاف محاولات الاتصال للبوت ${options.username} بشكل نهائي.`);
            }
        }
    });

    bot.on('error', (err) => {
        console.log(`[x] خطأ في ${options.username}:`, err.message);
        botsStatus[options.username].status = '❌ خطأ برمجي';
        botsStatus[options.username].reason = err.message;
        delete activeBots[options.username]; // تفريغ الذاكرة
    });

    return bot;
}

module.exports = { createBot, botsStatus, activeBots };

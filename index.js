const { createBot, botsStatus, activeBots } = require('./bot.js'); // استدعاء activeBots

// مسار تشغيل البوت
app.post('/api/start-bot', (req, res) => {
    const { ip, port, username, version, authCommand } = req.body;

    if (!ip || !username) {
        return res.status(400).json({ error: 'الرجاء توفير IP واسم البوت.' });
    }

    // [تعديل] التأكد من أن البوت لا يعمل بالفعل
    if (activeBots[username]) {
        return res.status(400).json({ error: `البوت ${username} قيد التشغيل بالفعل!` });
    }

    try {
        createBot({ ip, port, username, version, authCommand });
        res.status(200).json({ message: `تم إرسال أمر التشغيل للبوت ${username}` });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ داخلي.' });
    }
});

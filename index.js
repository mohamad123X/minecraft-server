const express = require('express');
const cors = require('cors');
const { createBot, botsStatus, activeBots } = require('./bot.js');

const app = express();

app.use(cors());
app.use(express.json());

// مسار تشغيل البوت
app.post('/api/start-bot', (req, res) => {
    // استلام أمر تسجيل الدخول من الواجهة (authCommand)
    const { ip, port, username, version, authCommand } = req.body;

    if (!ip || !username) {
        return res.status(400).json({ error: 'الرجاء توفير IP واسم البوت.' });
    }

    // التأكد من أن البوت لا يعمل بالفعل لمنع تكرار النسخ في الذاكرة
    if (activeBots && activeBots[username]) {
        return res.status(400).json({ error: `البوت ${username} قيد التشغيل بالفعل!` });
    }

    try {
        createBot({ ip, port, username, version, authCommand });
        res.status(200).json({ message: `تم إرسال أمر التشغيل للبوت ${username}` });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ داخلي.' });
    }
});

// مسار لمعرفة حالة البوت وسبب الطرد من Blogger
app.get('/api/status/:username', (req, res) => {
    const username = req.params.username;
    // جلب الحالة من الكائن، أو إرجاع رسالة "غير موجود" إذا لم يتم تشغيله بعد
    const status = botsStatus[username] || { status: 'مجهول', reason: 'البوت لم يبدأ بعد' };
    res.status(200).json(status);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[+] السيرفر يعمل بامتياز على المنفذ ${PORT}`);
});

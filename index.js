// استدعاء الحزم المطلوبة
const express = require('express');
const cors = require('cors');
const { createBot } = require('./bot.js');

const app = express();

// تفعيل CORS للسماح لـ Blogger بالاتصال بهذا السيرفر
app.use(cors());
// تفعيل قراءة البيانات بصيغة JSON من الواجهة
app.use(express.json());

// إنشاء مسار (Endpoint) لاستقبال طلبات تشغيل البوت
app.post('/api/start-bot', (req, res) => {
    // استخراج بيانات البوت المرسلة من واجهة Blogger
    const { ip, port, username, version } = req.body;

    // التحقق من وجود البيانات الأساسية
    if (!ip || !username) {
        // إرجاع خطأ إذا كانت البيانات ناقصة
        return res.status(400).json({ error: 'الرجاء توفير IP واسم البوت.' });
    }

    try {
        // تشغيل البوت باستخدام الدالة الموجودة في bot.js
        createBot({ ip, port, username, version });
        
        // إرسال رد بنجاح العملية لواجهة المستخدم
        res.status(200).json({ message: `تم إرسال البوت ${username} إلى السيرفر بنجاح!` });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ داخلي أثناء تشغيل البوت.' });
    }
});

// إعداد المنفذ (Railway يوفر المنفذ تلقائياً عبر process.env.PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[+] السيرفر يعمل بامتياز على المنفذ ${PORT}`);
});

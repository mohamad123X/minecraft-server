const express = require('express');
const { fork } = require('child_process');
const cors = require('cors');
const { Pool } = require('pg'); // استيراد مكتبة الـ Postgres

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = process.env.API_KEY || "YOUR_SECRET_KEY_HERE";
const activeBots = new Map();

// إعداد الاتصال بقاعدة بيانات Postgres 
// Railway توفر متغير البيئة DATABASE_URL تلقائياً عند ربط الداتابيز بالمشروع
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // مطلوب للاتصال الآمن بخوادم Railway السحابية
    }
});

// دالة لتهيئة قاعدة البيانات وإنشاء الجداول إذا لم تكن موجودة
async function initDatabase() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS saved_bots (
            bot_id VARCHAR(100) PRIMARY KEY,
            server_ip VARCHAR(255) NOT NULL,
            username VARCHAR(100) NOT NULL,
            user_who_sent VARCHAR(100),
            saved_by_username VARCHAR(100),
            saved_by_user_id VARCHAR(100),
            is_saved_247 BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log('[DATABASE] Connected and tables are ready.');
        // استعادة البوتات المحفوظة فوراً بعد التأكد من الجدول
        await restoreBotsFromDatabase();
    } catch (err) {
        console.error('[DATABASE ERROR] Failed to initialize database:', err.message);
    }
}

// دالة تشغيل البوت كعملية فرعية
function launchBotProcess(botId, serverIp, username, userWhoSent) {
    const botProcess = fork('./bot.js', [serverIp, '25565', username]);
    
    // حفظ البيانات مؤقتاً في الذاكرة العشوائية للعملية
    botProcess.botData = { botId, serverIp, username, userWhoSent, isSaved247: false };
    activeBots.set(botId, botProcess);

    console.log(`[LAUNCH] Bot ${username} launched by: ${userWhoSent}`);

    botProcess.on('exit', () => {
        activeBots.delete(botId);
    });
}

// استعادة البوتات التي طلب أصحابها حفظها 24/7 من الـ Postgres
async function restoreBotsFromDatabase() {
    try {
        const res = await pool.query('SELECT * FROM saved_bots WHERE is_saved_247 = TRUE');
        console.log(`[DATABASE] Restoring ${res.rows.length} permanent bots from Postgres...`);
        
        res.rows.forEach(bot => {
            // إعادة تشغيل كل بوت باسمه وبياناته القديمة
            launchBotProcess(bot.bot_id, bot.server_ip, bot.username, bot.user_who_sent);
            
            // وسم العملية في الذاكرة بأنها محصنة ومحفوظة
            const proc = activeBots.get(bot.bot_id);
            if (proc) proc.botData.isSaved247 = true;
        });
    } catch (err) {
        console.error('[DATABASE ERROR] Failed to restore bots:', err.message);
    }
}

// 1. مسار التشغيل الأولي (مؤقت حتى يضغط على زر الكتاب)
app.post('/api/start-bot', async (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(403).json({ error: 'Access Denied' });

    const { serverIp, username, userWhoSent } = req.body;
    if (!serverIp || !username) return res.status(400).json({ error: 'Missing parameters' });

    const botId = `${username}_${Date.now()}`;
    launchBotProcess(botId, serverIp, username, userWhoSent || "زائر");

    res.json({ success: true, botId });
});

// 2. مسار إرسال الأوامر والتشات (دون تغيير)
app.post('/api/bot/chat', (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(403).json({ error: 'Access Denied' });
    const { botId, message } = req.body;

    const botProcess = activeBots.get(botId);
    if (!botProcess) return res.status(444).json({ error: 'البوت غير متصل حالياً' });

    botProcess.send({ type: 'send_chat', text: message });
    res.json({ success: true });
});

// 3. مسار الحفظ الدائم (زر الكتاب المينيمال) -> الحفظ في الـ Postgres
app.post('/api/save-bot', async (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(403).json({ error: 'Access Denied' });

    const { botId, username, userId } = req.body;
    const botProcess = activeBots.get(botId);

    if (!botProcess) return res.status(404).json({ error: 'البوت غير موجود لتأمينه' });

    try {
        // تحديث بيانات البوت في الرام
        botProcess.botData.isSaved247 = true;
        botProcess.botData.savedByUsername = username;
        botProcess.botData.savedByUserId = userId;

        const b = botProcess.botData;

        // إدخال البيانات أو تحديثها في جدول Postgres الموثق
        const insertQuery = `
            INSERT INTO saved_bots (bot_id, server_ip, username, user_who_sent, saved_by_username, saved_by_user_id, is_saved_247)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (bot_id) 
            DO UPDATE SET is_saved_247 = TRUE, saved_by_username = $5, saved_by_user_id = $6;
        `;
        
        await pool.query(insertQuery, [b.botId, b.serverIp, b.username, b.userWhoSent, username, userId, true]);
        
        console.log(`[POSTGRES SUCCESS] Bot ${b.username} secured permanently for user: ${username}`);
        res.json({ success: true, message: 'Saved successfully in Postgres SQL' });

    } catch (err) {
        console.error('[SQL ERROR]', err.message);
        res.status(500).json({ error: 'فشل الحفظ في قاعدة البيانات السحابية' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server online on port ${PORT}`);
    initDatabase(); // تشغيل تهيئة الداتابيز فور عمل السيرفر
});app.post('/api/start-bot', (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(403).json({ error: 'Access Denied' });
    const { serverIp, username, userWhoSent } = req.body;
    if (!serverIp || !username) return res.status(400).json({ error: 'Missing parameters' });

    const botId = `${username}_${Date.now()}`;
    launchBotProcess(botId, serverIp, username, userWhoSent);
    res.json({ success: true, botId });
});

// مسار إرسال التشات أو الأوامر الفورية للبوت داخل اللعبة
app.post('/api/bot/chat', (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(403).json({ error: 'Access Denied' });
    const { botId, message } = req.body;

    const botProcess = activeBots.get(botId);
    if (!botProcess) return res.status(444).json({ error: 'البوت غير متصل حالياً أو متوقف' });

    // إرسال الرسالة أو الأمر عبر تكنولوجيا IPC إلى ملف bot.js
    botProcess.send({ type: 'send_chat', text: message });
    
    res.json({ success: true, message: 'تم إرسال الأمر/الرسالة بنجاح للسيرفر' });
});

// مسار حفظ البوت الدائم 24/7
app.post('/api/save-bot', (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(403).json({ error: 'Access Denied' });
    const { botId, username, userId } = req.body;
    const botProcess = activeBots.get(botId);
    if (!botProcess) return res.status(404).json({ error: 'البوت غير موجود' });

    botProcess.botData.isSaved247 = true;
    botProcess.botData.savedByUsername = username;
    botProcess.botData.savedByUserId = userId;
    savePermanentBotsToDisk();
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server online on port ${PORT}`));

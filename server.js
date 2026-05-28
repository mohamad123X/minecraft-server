const express = require('express');
const { fork } = require('child_process');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// الإعدادات الخاصة بديسكورد (يتم جلبها من متغيرات بيئة Railway للأمان)
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI; 
const BLOGGER_URL = 'https://yourblog.blogspot.com'; // رابط مدونتك الأساسي

const API_KEY = process.env.API_KEY || "YOUR_SECRET_KEY_HERE";
const DB_FILE = path.join(__dirname, 'bots.json');
const activeBots = new Map();

// ================= نظام تسجيل دخول ديسكورد الحقيقي =================

// 1. مسار تحويل المستخدم إلى صفحة ديسكورد الرسمية
app.get('/api/auth/login', (req, res) => {
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
    res.redirect(discordAuthUrl);
});

// 2. مسار الاستقبال (الذي يعود إليه ديسكورد بعد موافقة المستخدم)
app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('لم يتم توفير رمز التوثيق من ديسكورد.');

    try {
        // تبادل الرمز المؤقت (Code) للحصول على توكن الوصول (Access Token)
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const tokenData = await tokenResponse.json();
        
        // جلب بيانات المستخدم الحقيقية باستخدام توكن الوصول
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const userData = await userResponse.json();

        // تشفير البيانات لإرسالها بشكل آمن في الرابط إلى Blogger
        const uName = encodeURIComponent(userData.username);
        const uId = encodeURIComponent(userData.id);
        const uAvatar = encodeURIComponent(`https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`);

        // إعادة توجيه المستخدم إلى Blogger ومعه بياناته الحقيقية
        res.redirect(`${BLOGGER_URL}/?login=success&username=${uName}&id=${uId}&avatar=${uAvatar}`);

    } catch (error) {
        console.error('[DISCORD ERROR]', error);
        res.status(500).send('حدث خطأ أثناء الاتصال بخوادم ديسكورد.');
    }
});

// ================= الأكواد السابقة الخاصة بالبوتات دون تغيير =================
function launchBotProcess(botId, serverIp, username, userWhoSent) {
    const botProcess = fork('./bot.js', [serverIp, '25565', username]);
    botProcess.botData = { botId, serverIp, username, userWhoSent, isSaved247: false };
    activeBots.set(botId, botProcess);
    botProcess.on('exit', () => { activeBots.delete(botId); savePermanentBotsToDisk(); });
}

function savePermanentBotsToDisk() {
    const permanentBots = [];
    for (const botProcess of activeBots.values()) {
        if (botProcess.botData.isSaved247) permanentBots.push(botProcess.botData);
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(permanentBots, null, 2));
}

app.post('/api/start-bot', (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(403).json({ error: 'Access Denied' });
    const { serverIp, username, userWhoSent } = req.body;
    if (!serverIp || !username) return res.status(400).json({ error: 'Missing parameters' });
    const botId = `${username}_${Date.now()}`;
    launchBotProcess(botId, serverIp, username, userWhoSent || "زائر");
    res.json({ success: true, botId });
});

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

const express = require('express');
const { fork } = require('child_process');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = process.env.API_KEY || "YOUR_SECRET_KEY_HERE";
const DB_FILE = path.join(__dirname, 'bots.json');
const activeBots = new Map();

// دالة إطلاق البوت
function launchBotProcess(botId, serverIp, username, userWhoSent) {
    const botProcess = fork('./bot.js', [serverIp, '25565', username]);
    
    botProcess.botData = { botId, serverIp, username, userWhoSent, isSaved247: false };
    activeBots.set(botId, botProcess);

    botProcess.on('exit', () => {
        activeBots.delete(botId);
        savePermanentBotsToDisk();
    });
}

function savePermanentBotsToDisk() {
    const permanentBots = [];
    for (const botProcess of activeBots.values()) {
        if (botProcess.botData.isSaved247) permanentBots.push(botProcess.botData);
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(permanentBots, null, 2));
}

// مسار تشغيل البوت الأولي
app.post('/api/start-bot', (req, res) => {
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

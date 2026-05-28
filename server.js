const express = require('express');
const { fork } = require('child_process');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const activeBots = new Map();

// تحديد مفتاح الحماية: سيقرأه من إعدادات Railway، أو يستخدم قيمة افتراضية
const API_KEY = process.env.API_KEY || "YOUR_SECRET_KEY_HERE";

app.post('/api/start-bot', (req, res) => {
    // 1. التحقق من مفتاح الحماية المرسل من الواجهة
    const clientKey = req.headers['x-api-key'];
    if (clientKey !== API_KEY) {
        return res.status(403).json({ error: 'Access Denied: Invalid API Key' });
    }

    const { serverIp, port, username } = req.body;

    if (!serverIp || !username) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const botId = `${username}_${Date.now()}`;

    // 2. تشغيل البوت في عملية فرعية معزولة
    const botProcess = fork('./bot.js', [serverIp, port || '25565', username]);

    activeBots.set(botId, botProcess);

    botProcess.on('exit', (code) => {
        console.log(`[INFO] Bot ${botId} stopped with code ${code}`);
        activeBots.delete(botId);
    });

    res.json({ 
        success: true, 
        botId: botId, 
        message: 'Bot launched successfully!' 
    });
});

app.get('/api/status', (req, res) => {
    res.json({ activeBots: activeBots.size });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[SERVER] Railway Backend running on port ${PORT}`);
});

const express = require('express');
const { fork } = require('child_process');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

// ================= الإعدادات =================
const PORT = process.env.PORT || 3000; 
const API_KEY = process.env.API_KEY || "YOUR_SECRET_KEY_HERE";
const activeBots = new Map();

// Discord
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const BLOGGER_URL = 'https://nonetworkofficial.blogspot.com';

// Database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // ضروري لـ Railway
});

// ================= DATABASE =================
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
        console.log('[DATABASE] Ready');
        await restoreBotsFromDatabase();
    } catch (err) {
        console.error('[DATABASE ERROR]', err.message);
    }
}

function launchBotProcess(botId, fullIp, username, userWhoSent) {
    // فصل الـ IP عن المنفذ إذا كان موجوداً (مثال: mc.server.net:12345)
    let host = fullIp;
    let port = '25565';
    if (fullIp.includes(':')) {
        [host, port] = fullIp.split(':');
    }

    // تشغيل البوت كعملية منفصلة
    const botProcess = fork('./bot.js', [host, port, username]);

    botProcess.botData = {
        botId,
        serverIp: fullIp,
        username,
        userWhoSent,
        isSaved247: false
    };

    activeBots.set(botId, botProcess);
    console.log(`[LAUNCH] ${username} on ${fullIp}`);

    botProcess.on('exit', () => activeBots.delete(botId));
}

async function restoreBotsFromDatabase() {
    try {
        const res = await pool.query('SELECT * FROM saved_bots WHERE is_saved_247 = TRUE');
        res.rows.forEach(bot => {
            launchBotProcess(bot.bot_id, bot.server_ip, bot.username, bot.user_who_sent);
            const proc = activeBots.get(bot.bot_id);
            if (proc) proc.botData.isSaved247 = true;
        });
    } catch (err) {
        console.error('[RESTORE ERROR]', err.message);
    }
}

// ================= AUTH =================
app.get('/api/auth/login', (req, res) => {
    const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
    res.redirect(url);
});

app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    try {
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
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

        const tokenData = await tokenRes.json();
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const user = await userRes.json();
        const uName = encodeURIComponent(user.username);
        const uId = encodeURIComponent(user.id);
        const uAvatar = encodeURIComponent(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`);

        res.redirect(`${BLOGGER_URL}/?login=success&username=${uName}&id=${uId}&avatar=${uAvatar}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Auth error');
    }
});

// ================= API =================
app.post('/api/start-bot', (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(403).json({ error: 'Access Denied' });

    const { serverIp, username, userWhoSent } = req.body;
    if (!serverIp || !username) return res.status(400).json({ error: 'Missing data' });

    const botId = `${username}_${Date.now()}`;
    launchBotProcess(botId, serverIp, username, userWhoSent || "زائر");

    res.json({ success: true, botId });
});

app.post('/api/bot/chat', (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(403).json({ error: 'Access Denied' });

    const { botId, message } = req.body;
    const bot = activeBots.get(botId);

    if (!bot) return res.status(404).json({ error: 'Bot offline' });

    bot.send({ type: 'send_chat', text: message });
    res.json({ success: true });
});

app.post('/api/save-bot', async (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(403).json({ error: 'Access Denied' });

    const { botId, username, userId } = req.body;
    const bot = activeBots.get(botId);

    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    try {
        bot.botData.isSaved247 = true;
        const b = bot.botData;

        await pool.query(`
            INSERT INTO saved_bots 
            (bot_id, server_ip, username, user_who_sent, saved_by_username, saved_by_user_id, is_saved_247)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (bot_id)
            DO UPDATE SET is_saved_247 = TRUE
        `, [b.botId, b.serverIp, b.username, b.userWhoSent, username, userId, true]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'DB error' });
    }
});

// ================= START =================
app.listen(PORT, () => {
    console.log(`[SERVER] Running on ${PORT}`);
    initDatabase();
});

const express = require('express');
const os = require('os');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://user:pass@postgres:5432/dashboard'
});

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

async function initialize() {
    try {
        await redisClient.connect();
        await pool.query(`
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Połączono z PostgreSQL i Redis. Tabela "items" gotowa.');
    } catch (err) {
        console.error('Błąd inicjalizacji:', err);
    }
}
initialize();

const startTime = Date.now();
let totalRequests = 0;

app.use((req, res, next) => {
    totalRequests++;
    next();
});

app.get('/health', async (req, res) => {
    let pgStatus = 'ok';
    let redisStatus = 'ok';
    try { await pool.query('SELECT 1'); } catch { pgStatus = 'error'; }
    try { await redisClient.ping(); } catch { redisStatus = 'error'; }

    res.json({
        status: (pgStatus === 'ok' && redisStatus === 'ok') ? 'ok' : 'error',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        postgres: pgStatus,
        redis: redisStatus
    });
});

app.get('/items', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM items ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Błąd bazy danych' });
    }
});

app.post('/items', async (req, res) => {
    const { name } = req.body;
    if (name) {
        try {
            await pool.query('INSERT INTO items (name) VALUES ($1)', [name]);
            res.status(201).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Błąd dodawania do bazy' });
        }
    } else {
        res.status(400).json({ error: 'Brak nazwy' });
    }
});

app.get('/stats', async (req, res) => {
    try {
        const cacheKey = 'api_stats';
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(JSON.parse(cachedData));
        }

        const result = await pool.query('SELECT COUNT(*) FROM items');
        const stats = {
            count: parseInt(result.rows[0].count, 10),
            instanceId: process.env.INSTANCE_ID || os.hostname(),
            uptime: Math.floor((Date.now() - startTime) / 1000),
            totalRequests: totalRequests,
            currentTime: new Date().toISOString()
        };

        await redisClient.setEx(cacheKey, 10, JSON.stringify(stats));
        
        res.setHeader('X-Cache', 'MISS');
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: 'Błąd statystyk' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend działa na porcie ${PORT}`));

module.exports = app;
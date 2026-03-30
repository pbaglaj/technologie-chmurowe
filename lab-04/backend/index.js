const express = require('express');
const os = require('os');
const app = express();

app.use(express.json());

const items = [];
const startTime = Date.now();
let totalRequests = 0;

app.use((req, res, next) => {
    totalRequests++;
    next();
});

app.get('/health', (req, res) => {
    res.json({
        status: "ok",
        uptime: Math.floor((Date.now() - startTime) / 1000)
    });
});

app.get('/items', (req, res) => res.json(items));

app.post('/items', (req, res) => {
    const { name } = req.body;
    if (name) items.push({ id: Date.now(), name });
    res.status(201).json({ success: true });
});

app.get('/stats', (req, res) => {
    res.json({
        count: items.length,
        instanceId: process.env.INSTANCE_ID || os.hostname(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        totalRequests: totalRequests,
        currentTime: new Date().toISOString()
    });
});

if (require.main === module) {
    app.listen(3000, () => console.log('Backend działa na porcie 3000'));
}

module.exports = app;
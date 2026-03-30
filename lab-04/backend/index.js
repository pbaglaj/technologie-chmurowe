const express = require('express');
const os = require('os');
const app = express();

app.use(express.json());

const items = [];

app.get('/items', (req, res) => res.json(items));

app.post('/items', (req, res) => {
    const { name } = req.body;
    if (name) items.push({ id: Date.now(), name });
    res.status(201).json({ success: true });
});

app.get('/stats', (req, res) => {
    res.json({
        count: items.length,
        instanceId: process.env.INSTANCE_ID || os.hostname() 
    });
});

app.listen(3000, () => console.log('Backend działa na porcie 3000'));
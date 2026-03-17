const express = require('express');
const os = require('os');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

let items = [{ id: 1, name: 'Produkt A' }];

app.get('/items', (req, res) => {
  res.json(items);
});

app.post('/items', (req, res) => {
  const newItem = { id: Date.now(), name: req.body.name };
  items.push(newItem);
  res.status(201).json(newItem);
});

app.get('/stats', (req, res) => {
  res.json({
    count: items.length,
    instanceId: process.env.INSTANCE_ID || os.hostname()
  });
});

app.listen(3000, () => {
  console.log('Backend listening on port 3000');
});
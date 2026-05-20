const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');
const client = require('prom-client');
const os = require('os');

const PORT = parseInt(process.env.PORT || '3000', 10);
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '30', 10);

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'notes',
  password: process.env.POSTGRES_PASSWORD || 'notes',
  database: process.env.POSTGRES_DB || 'notes',
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

const redis = createClient({
  url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`,
});
redis.on('error', (err) => console.error('[redis] error', err.message));

const register = new client.Registry();
register.setDefaultLabels({ app: 'notes-api', instance: os.hostname() });
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});
const cacheHits = new client.Counter({
  name: 'notes_cache_hits_total',
  help: 'Number of times the notes list was served from Redis',
  registers: [register],
});
const cacheMisses = new client.Counter({
  name: 'notes_cache_misses_total',
  help: 'Number of times the notes list fell back to Postgres',
  registers: [register],
});

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequests.inc(labels);
    end(labels);
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', host: os.hostname() });
});

app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    if (!redis.isReady) throw new Error('redis not ready');
    await redis.ping();
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not-ready', error: err.message });
  }
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/api/notes', async (_req, res, next) => {
  try {
    const cached = redis.isReady ? await redis.get('notes:list') : null;
    if (cached) {
      cacheHits.inc();
      return res.json({ source: 'cache', items: JSON.parse(cached) });
    }
    cacheMisses.inc();
    const { rows } = await pool.query(
      'SELECT id, content, created_at FROM notes ORDER BY id ASC'
    );
    if (redis.isReady) {
      await redis.set('notes:list', JSON.stringify(rows), { EX: CACHE_TTL_SECONDS });
    }
    res.json({ source: 'db', items: rows });
  } catch (err) {
    next(err);
  }
});

app.post('/api/notes', async (req, res, next) => {
  try {
    const content = (req.body && req.body.content) || '';
    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'content (non-empty string) is required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO notes (content) VALUES ($1) RETURNING id, content, created_at',
      [content.trim()]
    );
    if (redis.isReady) await redis.del('notes:list');
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/notes/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    const { rowCount } = await pool.query('DELETE FROM notes WHERE id = $1', [id]);
    if (redis.isReady) await redis.del('notes:list');
    if (rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'internal server error' });
});

async function start() {
  try {
    await redis.connect();
    console.log('[redis] connected');
  } catch (err) {
    console.error('[redis] initial connect failed; will keep retrying via client', err.message);
  }
  const server = app.listen(PORT, () => {
    console.log(`[api] listening on :${PORT}`);
  });
  const shutdown = async (signal) => {
    console.log(`[api] received ${signal}, shutting down`);
    server.close(() => console.log('[api] http closed'));
    try { await redis.quit(); } catch {}
    try { await pool.end(); } catch {}
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();

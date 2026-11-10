import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConfig } from './server/config.js';
import { askRouter } from './server/routes/ask.js';
import { generateRouter } from './server/routes/generate.js';
import { scanRouter } from './server/routes/scan.js';
import { deployRouter } from './server/routes/deploy.js';
import { healthRouter, incrementRequestCount } from './server/routes/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const config = getConfig();

// Middleware: Body parsers with safe limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple in-memory rate limiting & quota tracking
const ipHitMap = new Map<string, { count: number; resetTime: number }>();
let globalDailyCount = 0;
let dailyResetTime = Date.now() + 24 * 60 * 60 * 1000;

app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Skip rate limits for static assets and health checks
  if (!req.path.startsWith('/api') || req.path === '/api/health' || req.path === '/api/stats' || req.path === '/api/metrics') {
    return next();
  }

  const now = Date.now();
  // Reset daily quota if 24 hours passed
  if (now > dailyResetTime) {
    globalDailyCount = 0;
    dailyResetTime = now + 24 * 60 * 60 * 1000;
  }

  // Check global cap
  if (globalDailyCount >= config.DAILY_GLOBAL_CAP) {
    return res.status(429).json({
      error: 'Global daily request limit reached. Please try again tomorrow or configure your own API key in Settings.',
    });
  }

  // Per-IP rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  let ipRecord = ipHitMap.get(clientIp);
  if (!ipRecord || now > ipRecord.resetTime) {
    ipRecord = { count: 0, resetTime: now + 60 * 1000 };
    ipHitMap.set(clientIp, ipRecord);
  }

  ipRecord.count++;
  if (ipRecord.count > config.RATE_LIMIT_PER_MINUTE) {
    return res.status(429).json({
      error: `Rate limit exceeded. Maximum ${config.RATE_LIMIT_PER_MINUTE} requests per minute.`,
    });
  }

  globalDailyCount++;
  incrementRequestCount();
  next();
});

// API Routes
app.use('/api/ask', askRouter);
app.use('/api/generate', generateRouter);
app.use('/api/scan', scanRouter);
app.use('/api/deploy', deployRouter);
app.use('/api', healthRouter);

export { app };

// Start server
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProd) {
    // Mount Vite dev server middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 GenForge server running at http://0.0.0.0:${port}`);
    console.log(`   - Mode: ${isProd ? 'Production' : 'Development (Vite Dev Server)'}`);
    console.log(`   - LLM: ${config.LLM_MODEL} (Build: ${config.LLM_MODEL_BUILD}, Ask: ${config.LLM_MODEL_ASK})`);
    console.log(`   - Scanner: ${config.SCANNER_URL}`);
  });
}

// Only start when directly executed
if (process.env.VERCEL !== '1' && (import.meta.url === `file://${process.argv[1]}` || !process.env.VERCEL)) {
  startServer().catch((err) => {
    console.error('Fatal error starting GenForge server:', err);
    process.exit(1);
  });
}

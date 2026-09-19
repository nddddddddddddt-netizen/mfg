import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/apiRouter.ts';
import { storage } from './server/storage.ts';
import { wsManager } from './server/wsManager.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Static files in production
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[TikSpark Pro Suite] Server listening on http://0.0.0.0:${PORT}`);
  // Auto start WS if enabled
  if (storage.getConfig().ws_enabled) {
    wsManager.startAll();
  }
});

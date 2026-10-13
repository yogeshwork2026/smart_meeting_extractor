import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { notesSchema } from './schema.js';
import { extractTasks } from './groq.js';
import { initDb, isDbUp, listTasks, saveTasks } from './db.js';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    model: config.groq.model,
    apiKey: config.groq.apiKey ? 'configured' : 'missing',
    database: (await isDbUp()) ? 'up' : 'down',
  });
});

app.post('/api/extract', async (req, res, next) => {
  try {
    const parsed = notesSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const tasks = await extractTasks(parsed.data.notes);

    if (tasks.length === 0) {
      return res.json({ tasks: [], message: 'No actionable tasks found in these notes.' });
    }

    // Extraction already succeeded, so a DB failure should not fail the request.
    try {
      return res.json({ tasks: await saveTasks(tasks), persisted: true });
    } catch (dbError) {
      console.error('[db] save failed:', dbError.message);
      return res.json({
        tasks,
        persisted: false,
        warning: `Tasks extracted but not saved: ${dbError.message}`,
      });
    }
  } catch (error) {
    return next(error);
  }
});

app.get('/api/tasks', async (_req, res, next) => {
  try {
    res.json({ tasks: await listTasks() });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((error, _req, res, _next) => {
  const status = error.statusCode ?? 500;
  if (status >= 500) console.error('[error]', error);
  res.status(status).json({ error: error.message || 'Unexpected server error' });
});

// Create the database/table if missing, but never block startup when MySQL is down.
try {
  await initDb();
  console.log('[db] ready');
} catch (error) {
  console.warn('[db] not ready:', error.message);
}

app.listen(config.port, () => {
  console.log(`API on http://localhost:${config.port} (model: ${config.groq.model})`);
  if (!config.groq.apiKey) {
    console.warn('[groq] GROQ_API_KEY is missing, /api/extract will fail until it is set');
  }
});

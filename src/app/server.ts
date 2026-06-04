import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AdminValidationError, parseAdminSweepForm, requireAdmin } from './admin.js';
import { env } from '../config/env.js';
import { calculateLeaderboard } from '../domain/sweep.js';
import { loadSweep, saveSweep } from '../services/sweepRepository.js';
import { createWorldCupProvider } from '../services/worldCupProvider.js';
import { renderAdminPage, renderDashboard } from './html.js';

export const app = new Hono();

app.use('/assets/*', serveStatic({ root: './public' }));

app.get('/health', (context) =>
  context.json({
    ok: true
  })
);

app.get('/', async (context) => {
  const sweep = await loadSweep();
  return context.html(renderDashboard(sweep));
});

app.get('/admin', async (context) => {
  const authResponse = requireAdmin(context);

  if (authResponse) {
    return authResponse;
  }

  const sweep = await loadSweep();
  return context.html(renderAdminPage(sweep));
});

app.post('/admin', async (context) => {
  const authResponse = requireAdmin(context);

  if (authResponse) {
    return authResponse;
  }

  const sweep = await loadSweep();
  const formData = await context.req.formData();

  try {
    const nextSweep = await parseAdminSweepForm(formData, sweep);
    const savedSweep = await saveSweep(nextSweep);

    return context.html(renderAdminPage(savedSweep, { message: 'Sweep saved.' }));
  } catch (error) {
    if (error instanceof AdminValidationError) {
      return context.html(renderAdminPage(error.sweep, { errors: error.issues }), 400);
    }

    throw error;
  }
});

app.get('/api/sweep', async (context) => {
  const sweep = await loadSweep();
  const snapshot = await createWorldCupProvider(env).getSnapshot();

  return context.json({
    sweep,
    leaderboard: calculateLeaderboard(sweep, snapshot),
    snapshot
  });
});

app.get('/api/world-cup', async (context) => {
  const snapshot = await createWorldCupProvider(env).getSnapshot();
  return context.json(snapshot);
});

if (isDirectRun()) {
  serve(
    {
      fetch: app.fetch,
      port: env.PORT
    },
    (info) => {
      console.log(`World Cup Tracker listening on http://localhost:${info.port}`);
    }
  );
}

function isDirectRun(): boolean {
  const entrypoint = process.argv[1];

  if (!entrypoint) {
    return false;
  }

  return fileURLToPath(import.meta.url) === path.resolve(entrypoint);
}

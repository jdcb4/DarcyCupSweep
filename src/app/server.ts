import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  AdminValidationError,
  parseAdminSweepForm,
  requireAdmin
} from './admin.js';
import { env } from '../config/env.js';
import {
  demoFirstDozenResultsSnapshot,
  demoNoResultsSnapshot,
  demoSweep
} from '../data/demo.js';
import { nations } from '../data/nations.js';
import { calculateLeaderboard } from '../domain/sweep.js';
import { buildSweepTracking } from '../domain/tracking.js';
import { loadSweep, saveSweep } from '../services/sweepRepository.js';
import { createWorldCupProvider } from '../services/worldCupProvider.js';
import { WorldCupSnapshotService } from '../services/worldCupSnapshotService.js';
import {
  renderAdminPage,
  renderDashboard,
  renderFinalisedMatchesPage,
  renderMatchesPage
} from './html.js';

export const app = new Hono();
export const worldCupSnapshotService = new WorldCupSnapshotService(
  createWorldCupProvider(env),
  env.RESULTS_PROVIDER
);

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

app.get('/demo/allocated', (context) =>
  context.html(
    renderDashboard(demoSweep, {
      apiPath: '/api/demo/allocated',
      notice: 'Demo: all teams allocated, no results yet.',
      demoLinks: true
    })
  )
);

app.get('/demo/results', (context) =>
  context.html(
    renderDashboard(demoSweep, {
      apiPath: '/api/demo/results',
      notice: 'Demo: all teams allocated, first dozen games completed.',
      demoLinks: true
    })
  )
);

app.get('/matches', (context) => context.html(renderMatchesPage()));

app.get('/finalised-matches', (context) =>
  context.html(renderFinalisedMatchesPage())
);

app.get('/admin', async (context) => {
  const authResponse = requireAdmin(context);

  if (authResponse) {
    return authResponse;
  }

  const sweep = await loadSweep();
  return context.html(renderAdminPage(sweep, nations));
});

app.post('/admin/refresh-results', async (context) => {
  const authResponse = requireAdmin(context);

  if (authResponse) {
    return authResponse;
  }

  const sweep = await loadSweep();

  try {
    const snapshot = await worldCupSnapshotService.refreshNow();

    return context.html(
      renderAdminPage(sweep, nations, {
        message: `World Cup data refreshed. Loaded ${snapshot.matches.length} matches and ${snapshot.standings.length} standings rows.`
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'World Cup data refresh failed.';

    return context.html(
      renderAdminPage(sweep, nations, {
        errorTitle: 'Could not refresh World Cup data',
        errors: [message]
      }),
      502
    );
  }
});

app.post('/admin', async (context) => {
  const authResponse = requireAdmin(context);

  if (authResponse) {
    return authResponse;
  }

  const sweep = await loadSweep();
  const formData = await context.req.formData();

  try {
    const nextSweep = await parseAdminSweepForm(
      formData,
      sweep,
      nations.map((nation) => nation.name)
    );
    const savedSweep = await saveSweep(nextSweep);

    return context.html(
      renderAdminPage(savedSweep, nations, { message: 'Sweep saved.' })
    );
  } catch (error) {
    if (error instanceof AdminValidationError) {
      return context.html(
        renderAdminPage(error.sweep, nations, { errors: error.issues }),
        400
      );
    }

    throw error;
  }
});

app.get('/api/sweep', async (context) => {
  const sweep = await loadSweep();
  const snapshot = await worldCupSnapshotService.getFreshSnapshot();

  return context.json({
    sweep,
    leaderboard: calculateLeaderboard(sweep, snapshot),
    tracking: buildSweepTracking(sweep, snapshot, nations),
    snapshot
  });
});

app.get('/api/demo/allocated', (context) =>
  context.json({
    sweep: demoSweep,
    leaderboard: calculateLeaderboard(demoSweep, demoNoResultsSnapshot),
    tracking: buildSweepTracking(demoSweep, demoNoResultsSnapshot, nations),
    snapshot: demoNoResultsSnapshot
  })
);

app.get('/api/demo/results', (context) =>
  context.json({
    sweep: demoSweep,
    leaderboard: calculateLeaderboard(demoSweep, demoFirstDozenResultsSnapshot),
    tracking: buildSweepTracking(
      demoSweep,
      demoFirstDozenResultsSnapshot,
      nations
    ),
    snapshot: demoFirstDozenResultsSnapshot
  })
);

app.get('/api/world-cup', async (context) => {
  const snapshot = await worldCupSnapshotService.getSnapshot();
  return context.json(snapshot);
});

if (isDirectRun()) {
  worldCupSnapshotService.start();

  serve(
    {
      fetch: app.fetch,
      port: env.PORT
    },
    (info) => {
      console.log(
        `World Cup Tracker listening on http://localhost:${info.port}`
      );
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

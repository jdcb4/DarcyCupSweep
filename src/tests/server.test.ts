import { describe, expect, it } from 'vitest';
import { app } from '../app/server.js';

describe('server', () => {
  it('responds to the health check', async () => {
    const response = await app.request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('renders the between-sweeps landing page without sweep dashboard data', async () => {
    const response = await app.request('/');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('Darcy Cup Sweep Tracker');
    expect(html).toContain('Sweep HQ');
    expect(html).toContain('Next sweep');
    expect(html).toContain('2026 AFL Grand Final');
    expect(html).toContain('2027 Women&#039;s FIFA World Cup');
    expect(html).not.toContain('data-api-path');
    expect(html).not.toContain('Prize leader');
    expect(html).not.toContain('Latest result');
    expect(html).not.toContain('Next match');
  });

  it('renders demo scenarios without touching persisted sweep state', async () => {
    const allocatedPage = await app.request('/demo/allocated');
    const resultsApi = await app.request('/api/demo/results');
    const payload = await resultsApi.json();

    expect(allocatedPage.status).toBe(200);
    expect(await allocatedPage.text()).toContain('/api/demo/allocated');
    expect(resultsApi.status).toBe(200);
    expect(payload.tracking.allUpcomingMatches).toHaveLength(4);
    expect(payload.tracking.allFinalisedMatches).toHaveLength(12);
    expect(payload.tracking.upcomingMatches).toHaveLength(4);
    expect(payload.tracking.recentResults).toHaveLength(4);
    expect(
      payload.tracking.recentResults[0].participantNames.length
    ).toBeGreaterThan(0);
  });

  it('renders an empty current upcoming matches page between sweeps', async () => {
    const response = await app.request('/matches');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('No active sweep schedule');
    expect(html).not.toContain('/assets/matches.js');
    expect(html).not.toContain('data-api-path');
  });

  it('renders an empty current finalised matches page between sweeps', async () => {
    const response = await app.request('/finalised-matches');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('No current sweep results');
    expect(html).not.toContain('/assets/matches.js');
    expect(html).not.toContain('data-api-path');
  });

  it('renders the sweep history page', async () => {
    const response = await app.request('/sweeps');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('Previous sweeps');
    expect(html).toContain('2026 Football World Cup');
    expect(html).toContain('2026 AFL Grand Final');
  });

  it('renders archived World Cup outcomes without match panels', async () => {
    const response = await app.request('/sweeps/2026-football-world-cup');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('Archived outcome');
    expect(html).toContain('Mitch won $850 with Spain');
    expect(html).toContain('Colombia');
    expect(html).toContain('Round of 16');
    expect(html).not.toContain('Most recent result');
    expect(html).not.toContain('All finalised matches');
    expect(html).not.toContain('/assets/app.js');
  });

  it('does not expose the manual provider refresh action without admin configuration', async () => {
    const response = await app.request('/admin/refresh-results', {
      method: 'POST'
    });

    expect(response.status).toBe(503);
    expect(await response.text()).toContain('Admin is disabled');
  });
});

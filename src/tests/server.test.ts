import { describe, expect, it } from 'vitest';
import { app } from '../app/server.js';

describe('server', () => {
  it('responds to the health check', async () => {
    const response = await app.request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('renders the dashboard', async () => {
    const response = await app.request('/');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('World Cup Sweep Tracker');
    expect(html).toContain('Darcy');
  });

  it('renders demo scenarios without touching persisted sweep state', async () => {
    const allocatedPage = await app.request('/demo/allocated');
    const resultsApi = await app.request('/api/demo/results');
    const payload = await resultsApi.json();

    expect(allocatedPage.status).toBe(200);
    expect(await allocatedPage.text()).toContain('/api/demo/allocated');
    expect(resultsApi.status).toBe(200);
    expect(payload.tracking.allUpcomingMatches).toHaveLength(4);
    expect(payload.tracking.upcomingMatches).toHaveLength(4);
    expect(payload.tracking.recentResults).toHaveLength(4);
    expect(payload.tracking.recentResults[0].participantNames.length).toBeGreaterThan(0);
  });

  it('renders the all upcoming matches page', async () => {
    const response = await app.request('/matches');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('Upcoming Matches | World Cup Sweep Tracker');
    expect(html).toContain('Australian Eastern time');
    expect(html).toContain('/assets/matches.js');
  });
});

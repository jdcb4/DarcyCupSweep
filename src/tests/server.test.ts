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
});


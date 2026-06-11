import { describe, expect, it } from 'vitest';
import { parseEnv } from '../config/env.js';

describe('environment config', () => {
  it('defaults to football-data as the results provider', () => {
    expect(parseEnv({}).RESULTS_PROVIDER).toBe('football-data');
  });
});

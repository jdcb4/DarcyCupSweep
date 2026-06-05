import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { env } from '../src/config/env.js';
import { sweepSchema } from '../src/domain/sweep.js';

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for db:migrate.');
}

const pool = new Pool({
  connectionString: env.DATABASE_URL
});

try {
  await pool.query(`
    create table if not exists app_state (
      key text primary key,
      data jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    create or replace function set_updated_at()
    returns trigger as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$ language plpgsql;
  `);

  await pool.query(`
    drop trigger if exists app_state_set_updated_at on app_state;
    create trigger app_state_set_updated_at
    before update on app_state
    for each row
    execute function set_updated_at();
  `);

  const existing = await pool.query('select 1 from app_state where key = $1 limit 1', ['sweep']);

  if (existing.rowCount === 0) {
    const file = await readFile(path.join(process.cwd(), 'src', 'data', 'sweep.json'), 'utf8');
    const sweep = sweepSchema.parse(JSON.parse(file) as unknown);
    await pool.query('insert into app_state (key, data) values ($1, $2::jsonb)', ['sweep', JSON.stringify(sweep)]);
  }

  console.log('Database migration complete.');
} finally {
  await pool.end();
}


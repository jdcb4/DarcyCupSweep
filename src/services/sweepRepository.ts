import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import { sweepSchema, type Sweep } from '../domain/sweep.js';

const sweepPath = path.join(process.cwd(), 'src', 'data', 'sweep.json');
let pool: Pool | null = null;

export async function loadSweep(): Promise<Sweep> {
  if (env.DATABASE_URL) {
    const result = await getPool().query('select data from app_state where key = $1 limit 1', ['sweep']);
    const data = result.rows[0]?.data;

    if (!data) {
      throw new Error('Sweep state is missing from Postgres. Run pnpm run db:migrate.');
    }

    return sweepSchema.parse(data);
  }

  const file = await readFile(sweepPath, 'utf8');
  const parsed = JSON.parse(file) as unknown;
  return sweepSchema.parse(parsed);
}

export async function saveSweep(sweep: Sweep): Promise<Sweep> {
  const validated = sweepSchema.parse(sweep);

  if (env.DATABASE_URL) {
    await getPool().query(
      `
        insert into app_state (key, data)
        values ($1, $2::jsonb)
        on conflict (key)
        do update set data = excluded.data
      `,
      ['sweep', JSON.stringify(validated)]
    );
    return validated;
  }

  await writeFile(sweepPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
  return validated;
}

function getPool(): Pool {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  pool ??= new Pool({
    connectionString: env.DATABASE_URL
  });

  return pool;
}

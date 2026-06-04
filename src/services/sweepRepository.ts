import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sweepSchema, type Sweep } from '../domain/sweep.js';

const sweepPath = path.join(process.cwd(), 'src', 'data', 'sweep.json');

export async function loadSweep(): Promise<Sweep> {
  const file = await readFile(sweepPath, 'utf8');
  const parsed = JSON.parse(file) as unknown;
  return sweepSchema.parse(parsed);
}

export async function saveSweep(sweep: Sweep): Promise<Sweep> {
  const validated = sweepSchema.parse(sweep);
  await writeFile(sweepPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
  return validated;
}

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  RESULTS_PROVIDER: z.enum(['mock', 'api-football', 'openfootball']).default('mock'),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  DATABASE_URL: z.string().url().optional(),
  API_FOOTBALL_KEY: z.string().optional(),
  API_FOOTBALL_BASE_URL: z.string().url().default('https://v3.football.api-sports.io'),
  OPENFOOTBALL_BASE_URL: z
    .string()
    .url()
    .default('https://raw.githubusercontent.com/openfootball/worldcup/master/2026--usa')
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): AppEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }

  return parsed.data;
}

export const env = parseEnv(process.env);

import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import type { Context } from 'hono';
import { env } from '../config/env.js';
import { getActivationIssues, sweepSchema, type Sweep } from '../domain/sweep.js';

export function requireAdmin(context: Context): Response | null {
  if (!env.ADMIN_PASSWORD) {
    return context.text('Admin is disabled until ADMIN_PASSWORD is set.', 503);
  }

  const authorization = context.req.header('Authorization');

  if (!authorization?.startsWith('Basic ')) {
    return unauthorized(context);
  }

  const decoded = Buffer.from(authorization.slice('Basic '.length), 'base64').toString('utf8');
  const [, password = ''] = decoded.split(':');

  if (!safeEqual(password, env.ADMIN_PASSWORD)) {
    return unauthorized(context);
  }

  return null;
}

export async function parseAdminSweepForm(formData: FormData, currentSweep: Sweep): Promise<Sweep> {
  const participants = currentSweep.participants.map((participant, index) => ({
    name: participant.name,
    teams: parseTeamText(String(formData.get(`teams-${index}`) ?? ''))
  }));
  const requestedStatus = formData.get('status') === 'active' ? 'active' : 'pre-sweep';
  const nextSweep = sweepSchema.parse({
    ...currentSweep,
    status: requestedStatus,
    participants
  });

  if (nextSweep.status === 'active') {
    const activationIssues = getActivationIssues(nextSweep);

    if (activationIssues.length > 0) {
      throw new AdminValidationError(activationIssues, {
        ...nextSweep,
        status: 'pre-sweep'
      });
    }
  }

  return nextSweep;
}

export class AdminValidationError extends Error {
  constructor(
    readonly issues: string[],
    readonly sweep: Sweep
  ) {
    super('Admin form validation failed.');
  }
}

function parseTeamText(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((team) => team.trim())
    .filter(Boolean);
}

function unauthorized(context: Context): Response {
  return context.text('Authentication required.', 401, {
    'WWW-Authenticate': 'Basic realm="World Cup Sweep Admin", charset="UTF-8"'
  });
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

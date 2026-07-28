import { sql } from 'drizzle-orm';
import type { StoreDb } from '../db/index.ts';

/** The health payload — served AS-IS by GET /health and trpc health.ping. */
export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  time: string;
  db: { ok: boolean };
}

/**
 * Connectivity snapshot for operators and probes: the instance is up and its
 * database answers. Lives in `infrastructure/` as an observability concern;
 * both transports (REST route, tRPC ping) return its payload untouched.
 */
export class HealthService {
  constructor(private readonly db: StoreDb) {}

  async check(): Promise<HealthStatus> {
    let dbOk = true;
    try {
      this.db.run(sql`select 1`);
    } catch {
      dbOk = false;
    }
    return {
      status: dbOk ? 'ok' : 'degraded',
      service: '@commun/core',
      time: new Date().toISOString(),
      db: { ok: dbOk },
    };
  }
}

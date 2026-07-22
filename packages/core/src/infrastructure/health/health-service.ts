import { sql } from 'drizzle-orm';
import type { StoreDb } from '../db/index.ts';

export interface HealthStatus {
  ok: boolean;
  service: string;
  time: string;
  db: { ok: boolean };
}

/**
 * Connectivity snapshot for operators and probes: the API is up and its
 * database answers. Lives in `infrastructure/` as an observability concern;
 * the tRPC `health` router is a thin transport over it. More probes (media
 * storage, site build) are added here as the system grows.
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
      ok: dbOk,
      service: '@commun/core',
      time: new Date().toISOString(),
      db: { ok: dbOk },
    };
  }
}

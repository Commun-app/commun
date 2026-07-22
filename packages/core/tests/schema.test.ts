import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { connectDb, type StoreDb } from '../src/infrastructure/db/index.ts';
import { organization } from '../src/domains/organization/schema.ts';
import { councilSessions, deliberations } from '../src/domains/deliberations/schema.ts';
import { listDefinitions } from '../src/domains/collections/queries.ts';

let dataDir: string;
let db: StoreDb;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-schema-test-'));
  db = connectDb(dataDir);
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe('schema — core domains', () => {
  test('organization is a configurable singleton row', () => {
    db.insert(organization).values({ name: 'Grigny', slug: 'grigny', type: 'commune' }).run();
    const rows = db.select().from(organization).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(1);
    expect(rows[0]?.name).toBe('Grigny');
  });

  test('the seed migration created the four default collections', () => {
    const slugs = listDefinitions(db)
      .map((definition) => definition.slug)
      .sort();
    expect(slugs).toEqual(['events', 'news', 'officials', 'projects']);
  });

  test('deliberations cascade-delete with their council session', () => {
    db.insert(councilSessions)
      .values({ id: 's1', title: 'Conseil de juillet', date: '2026-07-01' })
      .run();
    db.insert(deliberations)
      .values({ sessionId: 's1', number: '2026-042', subject: 'Budget participatif' })
      .run();
    expect(db.select().from(deliberations).all()).toHaveLength(1);

    db.delete(councilSessions).where(eq(councilSessions.id, 's1')).run();
    expect(db.select().from(deliberations).all()).toHaveLength(0);
  });
});

import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { connectDb, type StoreDb } from '../src/infrastructure/db/index.ts';
import { collectivite } from '../src/domains/collectivite/schema.ts';
import { actualites } from '../src/domains/actualites/schema.ts';
import { seances, deliberations } from '../src/domains/deliberations/schema.ts';

let dataDir: string;
let db: StoreDb;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-schema-test-'));
  db = connectDb(dataDir);
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe('schema — domaines du socle', () => {
  test('collectivite is a configurable singleton row', () => {
    db.insert(collectivite).values({ name: 'Grigny', slug: 'grigny', type: 'commune' }).run();
    const rows = db.select().from(collectivite).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(1);
    expect(rows[0]?.name).toBe('Grigny');
  });

  test('content rows default to draft with generated ids and timestamps', () => {
    db.insert(actualites).values({ title: 'Bienvenue', slug: 'bienvenue' }).run();
    const [row] = db.select().from(actualites).all();
    expect(row?.id).toBeTruthy();
    expect(row?.status).toBe('draft');
    expect(row?.publishedAt).toBeNull();
    expect(row?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('deliberations cascade-delete with their seance', () => {
    db.insert(seances).values({ id: 's1', title: 'Conseil de juillet', date: '2026-07-01' }).run();
    db.insert(deliberations)
      .values({ seanceId: 's1', numero: '2026-042', objet: 'Budget participatif' })
      .run();
    expect(db.select().from(deliberations).all()).toHaveLength(1);

    db.delete(seances).where(eq(seances.id, 's1')).run();
    expect(db.select().from(deliberations).all()).toHaveLength(0);
  });
});

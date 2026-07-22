import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectDb, type StoreDb } from '../src/infrastructure/db/index.ts';
import { fieldDefinitionSchema } from '../src/domains/collections/fields.ts';
import {
  createDefinition,
  createEntry,
  getDefinition,
} from '../src/domains/collections/queries.ts';
import { collectionDefinitionCreateSchema } from '../src/domains/collections/validation.ts';
import { CommunError } from '../src/common/errors/index.ts';

let dataDir: string;
let db: StoreDb;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-collections-test-'));
  db = connectDb(dataDir);
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

const marchesPublics = {
  name: 'Marchés publics',
  slug: 'marches-publics',
  fields: [
    { name: 'titre', label: 'Titre', type: 'texte', required: true },
    { name: 'date_limite', label: 'Date limite', type: 'date', required: true },
    { name: 'document', label: 'Document', type: 'media', required: false },
    { name: 'etat', label: 'État', type: 'liste-de-choix', options: ['ouvert', 'clos'] },
  ],
};

describe('collections personnalisées', () => {
  test('rejects a field type outside the closed set', () => {
    const parsed = fieldDefinitionSchema.safeParse({
      name: 'x',
      label: 'X',
      type: 'html-libre',
    });
    expect(parsed.success).toBe(false);
  });

  test('rejects a liste-de-choix without options', () => {
    const parsed = fieldDefinitionSchema.safeParse({
      name: 'etat',
      label: 'État',
      type: 'liste-de-choix',
    });
    expect(parsed.success).toBe(false);
  });

  test('creates a definition and validates entries against generated schema', () => {
    const input = collectionDefinitionCreateSchema.parse(marchesPublics);
    const definition = createDefinition(db, input);
    expect(getDefinition(db, 'marches-publics').id).toBe(definition.id);

    const entry = createEntry(db, definition.id, {
      title: 'Réfection de la voirie',
      slug: 'refection-voirie',
      data: { titre: 'Réfection de la voirie', date_limite: '2026-09-01', etat: 'ouvert' },
    });
    expect(entry.status).toBe('draft');
    expect(entry.collectionId).toBe(definition.id);
  });

  test('rejects entry data violating the definition', () => {
    expect(() =>
      createEntry(db, 'marches-publics', {
        title: 'Entrée invalide',
        slug: 'entree-invalide',
        // date_limite manquante + choix hors liste
        data: { titre: 'X', etat: 'annulé' },
      }),
    ).toThrow(CommunError);
  });
});

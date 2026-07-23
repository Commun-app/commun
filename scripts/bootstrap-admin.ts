#!/usr/bin/env bun
// First-admin bootstrap CLI (spec self-hosting) — replaces the former Nitro
// plugin. Creates a single-use admin invitation on a VIRGIN instance only;
// refused as soon as any user exists (never replayable to take over an
// initialised instance).
//
//   dev    : bun scripts/bootstrap-admin.ts maire@commune.fr
//   docker : docker compose exec api bun bootstrap-admin.mjs maire@commune.fr
import { consola } from 'consola';
import { createCore } from '@commun/core';

const email = process.argv[2];
if (!email || !email.includes('@')) {
  consola.error('usage: bootstrap-admin <email>');
  process.exit(1);
}

const core = createCore();
if (core.services.users.hasAnyUser()) {
  consola.error('Des utilisateurs existent déjà — le bootstrap est refusé.');
  process.exit(1);
}

const { token, expiresAt } = core.services.users.createInvitation({ email, role: 'admin' });
consola.box(
  `Invitation admin créée pour ${email}\n\n` +
    `Lien (usage unique, expire le ${expiresAt}) :\n` +
    `/welcome?token=${token}\n\n` +
    `À consommer via tRPC auth.acceptInvitation avec ce token.`,
);

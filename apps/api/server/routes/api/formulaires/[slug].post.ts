import { defineHandler } from 'nitro';
import { HTTPError } from 'h3';
import { CommunError, submitFormulaire } from '@commun/core';
import { rateLimit } from '../../../services/content-auth.ts';
import { useCore } from '../../../services/context.ts';

/**
 * Public citizen-form submission — the ONLY anonymous write of the whole API.
 * Rate-limited per IP; `data` is validated against the form's field
 * definitions inside `submitFormulaire`.
 */
export default defineHandler(async (event) => {
  const req = event.req as unknown as Request;
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    event.context.clientAddress ||
    'unknown';
  rateLimit(ip);

  const slug = event.context.params?.slug ?? '';
  const body = (await req.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
  if (!body?.data || typeof body.data !== 'object') {
    throw new HTTPError({ status: 400, message: 'corps attendu: { "data": { ... } }' });
  }

  try {
    const soumission = submitFormulaire(useCore().db, slug, body.data);
    return { received: true, id: soumission.id };
  } catch (error) {
    if (error instanceof CommunError) {
      throw new HTTPError({
        status: error.code === 'NOT_FOUND' ? 404 : 400,
        message: error.message,
      });
    }
    throw error;
  }
});

import { z } from 'zod';
import type { User } from '../schema.ts';

export const inviteDto = z.object({ email: z.email(), role: z.enum(['admin', 'redacteur']) });

export const userUpdateDto = z.object({
  id: z.string(),
  data: z.object({
    name: z.string().min(1).optional(),
    role: z.enum(['admin', 'redacteur']).optional(),
  }),
});

/** Public projection of a user — the ONLY user shape transport layers return. */
export const toPublicUser = ({ id, email, name, role }: User) => ({ id, email, name, role });

export type PublicUser = ReturnType<typeof toPublicUser>;
export type InviteDto = z.infer<typeof inviteDto>;
export type UserUpdateDto = z.infer<typeof userUpdateDto>;

import { z } from 'zod';
import type { User } from './schema.ts';

// tRPC contracts of the users domain: input DTOs + the public output shape
// (passwordHash and friends never leave the service layer).

export const loginDto = z.object({ email: z.email(), password: z.string().min(1) });

export const acceptInvitationDto = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(10),
});

export const inviteDto = z.object({ email: z.email(), role: z.enum(['admin', 'redacteur']) });

export const userUpdateDto = z.object({
  id: z.string(),
  data: z.object({
    name: z.string().min(1).optional(),
    role: z.enum(['admin', 'redacteur']).optional(),
  }),
});

export const apiTokenCreateDto = z.object({ name: z.string().min(1) });

/** Public projection of a user — the ONLY user shape transport layers return. */
export const toPublicUser = ({ id, email, name, role }: User) => ({ id, email, name, role });

export type PublicUser = ReturnType<typeof toPublicUser>;
export type LoginDto = z.infer<typeof loginDto>;
export type AcceptInvitationDto = z.infer<typeof acceptInvitationDto>;
export type InviteDto = z.infer<typeof inviteDto>;

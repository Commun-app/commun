import { z } from 'zod';

export const loginDto = z.object({ email: z.email(), password: z.string().min(1) });

export const acceptInvitationDto = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(10),
});

export type LoginDto = z.infer<typeof loginDto>;
export type AcceptInvitationDto = z.infer<typeof acceptInvitationDto>;

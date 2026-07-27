import { z } from 'zod';

export const loginDto = z.object({ email: z.email(), password: z.string().min(1) });

export const acceptInvitationDto = z.object({
  token: z.string().min(1),
  // Optionnel : le flux « mot de passe oublié » (9.9) réutilise l'acceptation
  // d'invitation en conservant le nom du compte existant.
  name: z.string().min(1).optional(),
  password: z.string().min(10),
});

export const requestPasswordResetDto = z.object({ email: z.email() });

export type LoginDto = z.infer<typeof loginDto>;
export type AcceptInvitationDto = z.infer<typeof acceptInvitationDto>;
export type RequestPasswordResetDto = z.infer<typeof requestPasswordResetDto>;

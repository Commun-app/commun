// Domain error codes raised by services. Each is a sentinel string that the
// tRPC layer converts to a typed error and the UI maps to a message.

export const ERR = {
  NOT_FOUND: 'NOT_FOUND',
  INVALID_STATE: 'INVALID_STATE',
} as const;

export type ErrorCode = (typeof ERR)[keyof typeof ERR];

export class CommunError extends Error {
  constructor(public readonly code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CommunError';
  }
}

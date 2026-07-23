import { defineHandler } from 'nitro';

// Returns the HealthStatus DTO from @commun/core untouched (review: no
// object rebuilding in the transport layer).
export default defineHandler((event) => event.context.core.services.health.check());

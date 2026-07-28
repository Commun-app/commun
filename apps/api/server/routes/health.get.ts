import { defineHandler } from 'nitro';
import { useCore } from '../utils/core.ts';

// Returns the HealthStatus DTO from @commun/core untouched (review: no
// object rebuilding in the transport layer).
export default defineHandler(() => useCore().services.health.check());

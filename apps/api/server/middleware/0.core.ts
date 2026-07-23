import { defineMiddleware } from 'h3';
import { getCore } from '../services/core-instance.ts';

// Runs first (middleware execute in filename order): every handler downstream
// reads the wired Core from `event.context.core`.
export default defineMiddleware((event) => {
  event.context.core = getCore();
});

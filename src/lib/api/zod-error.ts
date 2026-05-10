import type { ZodError } from 'zod';

/**
 * Convert a ZodError into a single human-readable string.
 * Prevents the [object Object] bug when passing fieldErrors directly to JSON.
 */
export function zodMsg(err: ZodError): string {
  const fields = err.flatten().fieldErrors;
  const parts = Object.entries(fields)
    .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
    .filter(Boolean);
  return parts.length ? parts.join(' | ') : err.message || 'Validation failed';
}

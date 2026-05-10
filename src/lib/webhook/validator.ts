/**
 * SYNKRON Webhook Validator
 * Validates GitHub webhook signatures using HMAC-SHA256.
 * Uses the Web Crypto API — no external dependencies.
 */

/**
 * Verify a GitHub webhook signature.
 * GitHub sends: X-Hub-Signature-256: sha256=<hex>
 */
export async function verifyGitHubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const expectedPrefix = 'sha256=';
  if (!signatureHeader.startsWith(expectedPrefix)) return false;

  const expectedHex = signatureHeader.slice(expectedPrefix.length);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody)
  );

  const actualHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqual(actualHex, expectedHex);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Parse a GitHub push webhook payload into a normalized structure.
 */
export interface ParsedPushPayload {
  repoFullName: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  authorUsername: string;
  modifiedFiles: string[];
  addedFiles: string[];
  removedFiles: string[];
}

export function parsePushPayload(payload: Record<string, any>): ParsedPushPayload {
  const commits: any[] = payload.commits || [];
  const ref: string = payload.ref || '';
  const branch = ref.replace('refs/heads/', '');

  // Aggregate all modified/added/removed files across commits
  const modifiedFiles = [...new Set(commits.flatMap((c: any) => c.modified || []))];
  const addedFiles = [...new Set(commits.flatMap((c: any) => c.added || []))];
  const removedFiles = [...new Set(commits.flatMap((c: any) => c.removed || []))];

  const headCommit = payload.head_commit || commits[0] || {};

  return {
    repoFullName: payload.repository?.full_name || 'unknown/repo',
    branch,
    commitSha: headCommit.id || payload.after || '',
    commitMessage: headCommit.message || commits[0]?.message || '',
    authorUsername:
      headCommit.author?.username ||
      payload.pusher?.name ||
      commits[0]?.author?.username ||
      'unknown',
    modifiedFiles,
    addedFiles,
    removedFiles,
  };
}

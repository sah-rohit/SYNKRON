/**
 * Webhook Test Ping
 * POST /api/webhook/test
 * 
 * Fires a real GitHub-style push payload to /api/webhook internally
 * and returns the full round-trip result.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const repoName = body.repoName || 'ostinato-user/test-repo';
  const branch = body.branch || 'main';
  const commitMessage = body.commitMessage || 'test: automated ping from dashboard';
  const filename = body.filename || 'src/auth/session.ts';

  const testPayload = {
    ref: `refs/heads/${branch}`,
    after: crypto.randomUUID().replace(/-/g, '').slice(0, 40),
    repository: {
      full_name: repoName,
      name: repoName.split('/').pop(),
      html_url: `https://github.com/${repoName}`,
    },
    pusher: { name: 'ostinato-test-bot', email: 'bot@ostinato.dev' },
    head_commit: {
      id: crypto.randomUUID().replace(/-/g, '').slice(0, 40),
      message: commitMessage,
      timestamp: new Date().toISOString(),
      author: { username: 'ostinato-test-bot', email: 'bot@ostinato.dev' },
      modified: [filename],
      added: [],
      removed: [],
    },
    commits: [
      {
        id: crypto.randomUUID().replace(/-/g, '').slice(0, 40),
        message: commitMessage,
        author: { username: 'ostinato-test-bot' },
        modified: [filename],
        added: [],
        removed: [],
      },
    ],
  };

  const startTime = Date.now();

  try {
    // Fire the payload to our own webhook endpoint
    const webhookUrl = new URL('/api/webhook', req.url);
    const webhookRes = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push',
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify(testPayload),
    });

    const webhookData = await webhookRes.json();
    const roundTripMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      roundTripMs,
      webhookResponse: webhookData,
      testPayload: {
        repo: repoName,
        branch,
        commitMessage,
        sha: testPayload.head_commit.id.slice(0, 8),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, roundTripMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}

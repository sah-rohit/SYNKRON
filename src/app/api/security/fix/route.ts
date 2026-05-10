/**
 * Ostinato Security Auto-Fix API
 * POST /api/security/fix
 *
 * Given a security finding, uses AI to suggest and optionally apply a fix.
 * The AI explains the vulnerability, provides a corrected code snippet,
 * and rates the confidence of the fix.
 *
 * Body: {
 *   finding: { file, line, rule, description, match, remediation },
 *   codeContext: string,   // surrounding code (±10 lines)
 *   autoApply?: boolean    // if true, returns the patched file content
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY, compatibility: 'strict' });

import { zodMsg } from '@/lib/api/zod-error';

const FixSchema = z.object({
  finding: z.object({
    file: z.string(),
    line: z.number(),
    rule: z.string(),
    description: z.string(),
    match: z.string(),
    remediation: z.string(),
    severity: z.string(),
  }),
  codeContext: z.string().max(10_000),
  fullFileContent: z.string().max(100_000).optional(),
  autoApply: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get('ostinato_session')?.value;
  if (!token) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = FixSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });

  const { finding, codeContext, fullFileContent, autoApply } = parsed.data;

  const prompt = `You are Ostinato's security remediation engine. A security scanner found the following issue:

**File:** \`${finding.file}\` (line ${finding.line})
**Rule:** ${finding.rule}
**Severity:** ${finding.severity.toUpperCase()}
**Issue:** ${finding.description}
**Detected pattern:** \`${finding.match}\`
**Recommended fix:** ${finding.remediation}

**Code context (around line ${finding.line}):**
\`\`\`
${codeContext}
\`\`\`

${autoApply && fullFileContent ? `**Full file content:**\n\`\`\`\n${fullFileContent}\n\`\`\`` : ''}

Respond with a JSON object (no markdown wrapper) with these exact fields:
{
  "explanation": "Clear explanation of why this is a security risk",
  "fixedCode": "The corrected code snippet replacing the vulnerable section",
  "confidence": 0.0-1.0,
  "breakingChange": true/false,
  "additionalSteps": ["any manual steps needed outside the code"],
  ${autoApply ? '"patchedFile": "complete patched file content if fullFileContent was provided, otherwise null",' : ''}
  "references": ["relevant CVE, OWASP, or documentation links"]
}`;

  let result: string;
  let modelUsed: string;

  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
      temperature: 0.1,
      maxTokens: 4096,
    });
    result = text;
    modelUsed = 'Groq llama-3.3-70b-versatile';
  } catch {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.1,
      maxTokens: 4096,
    });
    result = text;
    modelUsed = 'OpenAI gpt-4o-mini';
  }

  // Parse JSON from AI response
  let parsed_result: Record<string, unknown>;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    parsed_result = JSON.parse(jsonMatch ? jsonMatch[0] : result);
  } catch {
    parsed_result = { explanation: result, fixedCode: '', confidence: 0.5, breakingChange: false, additionalSteps: [], references: [] };
  }

  return NextResponse.json({
    success: true,
    modelUsed,
    finding,
    ...parsed_result,
  });
}

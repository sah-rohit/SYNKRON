/**
 * SYNKRON UI Rater API
 * POST /api/ui-rater
 *
 * Accepts up to 5 base64-encoded screenshots and/or a URL + description.
 * Uses a vision-capable AI model to rate the UI across 6 dimensions
 * and return structured feedback.
 *
 * Body: {
 *   screenshots?: string[],   // base64 data URLs (max 5, each max 5MB)
 *   url?: string,
 *   description?: string,     // what the website does / target audience
 *   focusAreas?: string[]     // e.g. ["accessibility", "mobile"]
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY, compatibility: 'strict' });
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const MAX_SCREENSHOTS = 5;
const MAX_B64_SIZE = 5 * 1024 * 1024 * 1.37; // ~5MB after base64 overhead

import { zodMsg } from '@/lib/api/zod-error';

const RaterSchema = z.object({
  screenshots: z.array(z.string()).max(MAX_SCREENSHOTS).optional().default([]),
  url: z.string().url().optional(),
  description: z.string().max(2000).optional().default(''),
  focusAreas: z.array(z.string().max(50)).max(6).optional().default([]),
});

export interface UIRatingDimension {
  name: string;
  score: number;       // 0–100
  grade: string;       // A+, A, B+, B, C, D, F
  summary: string;
  issues: string[];
  suggestions: string[];
}

export interface UIRatingResult {
  overallScore: number;
  overallGrade: string;
  headline: string;
  dimensions: UIRatingDimension[];
  topStrengths: string[];
  criticalIssues: string[];
  quickWins: string[];
  modelUsed: string;
  analyzedAt: string;
}

function scoreToGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RaterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: zodMsg(parsed.error) }, { status: 422 });
  }

  const { screenshots, url, description, focusAreas } = parsed.data;

  if (!screenshots.length && !url && !description) {
    return NextResponse.json(
      { success: false, error: 'Provide at least one screenshot, a URL, or a description.' },
      { status: 400 }
    );
  }

  // Validate screenshot sizes
  for (const s of screenshots) {
    if (s.length > MAX_B64_SIZE) {
      return NextResponse.json({ success: false, error: 'One or more screenshots exceed 5MB.' }, { status: 413 });
    }
  }

  const hasVision = screenshots.length > 0;
  const focusText = focusAreas.length ? `\nFocus especially on: ${focusAreas.join(', ')}.` : '';

  const systemPrompt = `You are SYNKRON's elite Principal Product Designer and UX/UI Analyst. You possess a masterful understanding of human-computer interaction (HCI), Gestalt principles, Nielsen's 10 Usability Heuristics, WCAG 2.2 accessibility standards, and modern design systems (Material, HIG).
You do NOT give generic advice. You diagnose visual hierarchy, typography scales, contrast ratios, cognitive load, and affordances with exact precision. You are rigorous, identifying critical flaws that juniors miss, while recognizing exceptional execution. Be highly specific, actionable, and analytical.`;

  const userPrompt = `Conduct a rigorous, expert-level UI/UX audit of the provided interface.

${url ? `**Website URL:** ${url}` : ''}
${description ? `**Description / Context:** ${description}` : ''}
${screenshots.length ? `**Screenshots provided:** ${screenshots.length}` : ''}
${focusText}

Evaluate the UI meticulously across these 6 dimensions (Score 0-100 each). Apply strict industry standards:

1. **Visual Design** — Typography (scale, line-height), color harmony, Gestalt grouping, white space usage, visual hierarchy, consistency.
2. **Usability** — Nielsen's heuristics (visibility of system status, error prevention, user control), cognitive load, affordance clarity, interaction cost.
3. **Accessibility** — Strict WCAG 2.2 principles (contrast ratios, focus states, scalable text readiness, semantic structuring cues).
4. **Performance Perception** — Visual feedback speed, skeleton loading efficacy, layout shift prevention, animation easing/purpose.
5. **Mobile Responsiveness** — Touch target sizing (min 44x44pt), viewport scaling, responsive layout degradation, thumb-zone optimization.
6. **Information Architecture** — Content chunking, labeling clarity, progressive disclosure, mental model alignment, navigation friction.

Respond with ONLY a valid JSON object (no markdown, no explanation outside JSON):
{
  "overallScore": <weighted average 0-100>,
  "headline": "<one punchy sentence summarizing the UI quality>",
  "dimensions": [
    {
      "name": "Visual Design",
      "score": <0-100>,
      "summary": "<2-3 sentence assessment>",
      "issues": ["<specific issue 1>", "<specific issue 2>"],
      "suggestions": ["<actionable fix 1>", "<actionable fix 2>"]
    }
    // ... repeat for all 6 dimensions
  ],
  "topStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "criticalIssues": ["<critical issue 1>", "<critical issue 2>"],
  "quickWins": ["<easy improvement 1>", "<easy improvement 2>", "<easy improvement 3>"]
}`;

  let rawResult: string;
  let modelUsed: string;

  try {
    if (hasVision && process.env.OPENAI_API_KEY) {
      // Use GPT-4o vision for screenshot analysis
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...screenshots.map((s) => ({
              type: 'image_url',
              image_url: { url: s, detail: 'high' },
            })),
          ],
        },
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) throw new Error(`OpenAI vision: ${response.status}`);
      const data = await response.json();
      rawResult = data.choices[0].message.content;
      modelUsed = 'OpenAI gpt-4o (vision)';
    } else {
      // Text-only analysis via Groq
      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: systemPrompt,
        prompt: userPrompt + (url ? `\n\nNote: No screenshots provided. Base your analysis on the URL and description.` : ''),
        temperature: 0.3,
        maxTokens: 4096,
      });
      rawResult = text;
      modelUsed = 'Groq llama-3.3-70b-versatile';
    }
  } catch (primaryErr: any) {
    // Final fallback
    try {
      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
        maxTokens: 4096,
      });
      rawResult = text;
      modelUsed = 'Groq llama-3.3-70b-versatile (fallback)';
    } catch (fallbackErr: any) {
      return NextResponse.json(
        { success: false, error: `AI analysis failed: ${primaryErr.message}` },
        { status: 502 }
      );
    }
  }

  // Parse AI JSON response
  let rating: Partial<UIRatingResult>;
  try {
    const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
    rating = JSON.parse(jsonMatch ? jsonMatch[0] : rawResult);
  } catch {
    return NextResponse.json(
      { success: false, error: 'AI returned malformed response. Please try again.' },
      { status: 502 }
    );
  }

  // Add computed grade fields
  const overallScore = typeof rating.overallScore === 'number' ? rating.overallScore : 0;
  const dimensions = (rating.dimensions ?? []).map((d: any) => ({
    ...d,
    grade: scoreToGrade(d.score ?? 0),
  }));

  const result: UIRatingResult = {
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    headline: rating.headline ?? 'Analysis complete.',
    dimensions,
    topStrengths: rating.topStrengths ?? [],
    criticalIssues: rating.criticalIssues ?? [],
    quickWins: rating.quickWins ?? [],
    modelUsed,
    analyzedAt: new Date().toISOString(),
  };

  // Persist to DB (best-effort)
  if (process.env.DATABASE_URL) {
    persistRating(result, url, description).catch(() => {});
  }

  return NextResponse.json({ success: true, rating: result });
}

async function persistRating(rating: UIRatingResult, url?: string, description?: string) {
  try {
    const { getDb, schema } = await import('@/lib/db');
    const db = getDb();
    await db.insert(schema.uiRatings).values({
      url: url ?? null,
      description: description ?? null,
      overallScore: rating.overallScore,
      overallGrade: rating.overallGrade,
      dimensions: rating.dimensions as any,
      topStrengths: rating.topStrengths,
      criticalIssues: rating.criticalIssues,
      quickWins: rating.quickWins,
      modelUsed: rating.modelUsed,
    });
  } catch { /* schema may not have this table yet */ }
}

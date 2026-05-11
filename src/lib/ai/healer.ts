/**
 * SYNKRON Intelligence Circuit
 * Primary Pipeline: Ollama Cloud (gemma4:31b-cloud)
 * Fallback Logic: Circuit breaker on failure or latency > 2000ms -> Groq (llama-3.1-8b-instant)
 */
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Simulates Ollama Cloud Endpoint configuration
const OLLAMA_ENDPOINT = process.env.OLLAMA_CLOUD_URL || 'https://api.ollama.cloud/v1/chat/completions';
const OLLAMA_API_KEY = process.env.OLLAMA_CLOUD_KEY;

export interface HealRequest {
  filename: string;
  /** Full source code of the file being healed */
  code?: string;
  /** Pre-formatted AST diff context string (takes priority over code) */
  astDiffContext?: string;
  existingMarkdown: string;
  /** Human-readable change summary from diffSnapshots */
  changeSummary?: string[];
}

export interface HealResult {
  success: boolean;
  markdown: string;
  modelUsed: string;
  durationMs: number;
  circuitStatus: 'PRIMARY' | 'FALLBACK_LATENCY' | 'FALLBACK_ERROR';
  error?: string;
}

/**
 * Primary path using Ollama Cloud with hard 2000ms timeout enforcement.
 */
async function tryOllamaCloud(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // Hard 2000ms limit

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemma4:31b-cloud',
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
    const data = await response.json();
    return data.choices[0].message.content || '';
  } catch (e) {
    clearTimeout(timeoutId);
    throw e; // Propagate to trigger fallback
  }
}

/**
 * Heal documentation using the Intelligence Circuit.
 */
export async function healDocumentation(req: HealRequest): Promise<HealResult> {
  const startTime = Date.now();
  const prompt = buildPrompt(req);

  // Step 1: Try primary pipeline (Ollama Cloud)
  try {
    const result = await tryOllamaCloud(prompt);
    return {
      success: true,
      markdown: result.trim(),
      modelUsed: 'Ollama Cloud (gemma4:31b-cloud)',
      durationMs: Date.now() - startTime,
      circuitStatus: 'PRIMARY',
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
    const circuitStatus = isTimeout ? 'FALLBACK_LATENCY' : 'FALLBACK_ERROR';
    
    console.warn(`[Circuit Breaker] Ollama Cloud failed (${circuitStatus}). Falling back to Groq.`);

    // Step 2: Fallback immediately to Groq
    try {
      const { text } = await generateText({
        model: groq('llama-3.1-8b-instant'),
        prompt,
        temperature: 0.1,
      });

      return {
        success: true,
        markdown: text.trim(),
        modelUsed: 'Groq llama-3.1-8b-instant',
        durationMs: Date.now() - startTime,
        circuitStatus,
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        markdown: '',
        modelUsed: 'failed',
        durationMs: Date.now() - startTime,
        circuitStatus,
        error: `Total circuit failure. ${fallbackErr.message}`,
      };
    }
  }
}

function buildPrompt(req: HealRequest): string {
  // Build the delta context: prefer explicit astDiffContext, then changeSummary, then full code
  let deltaContext: string;
  if (req.astDiffContext) {
    deltaContext = req.astDiffContext;
  } else if (req.changeSummary?.length) {
    deltaContext = req.changeSummary.map((s) => `- ${s}`).join('\n');
    if (req.code) {
      deltaContext += `\n\n**Full source for context:**\n\`\`\`\n${req.code.slice(0, 8000)}\n\`\`\``;
    }
  } else if (req.code) {
    deltaContext = `**Full source (no previous snapshot available):**\n\`\`\`\n${req.code.slice(0, 8000)}\n\`\`\``;
  } else {
    deltaContext = '(No code context provided)';
  }

  return `You are the SYNKRON self-healing engine.
Focus exclusively on the DELTA (AST-diff) provided below to update the documentation.

**File Target:** \`${req.filename}\`

**AST-Diff Context (The Delta):**
${deltaContext}

**Current Context (Existing Markdown):**
${req.existingMarkdown || '(None)'}

**Task:**
Update the documentation based solely on the semantic changes shown in the diff.
Maintain clarity, output only the valid markdown without code fencing block for the outer container.
`;
}


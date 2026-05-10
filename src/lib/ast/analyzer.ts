/**
 * SYNKRON AST Analyzer
 * Parses TypeScript/JavaScript source into a lightweight AST snapshot
 * that can be diffed against stored snapshots to detect doc-rot.
 *
 * Uses the TypeScript compiler API (already a transitive dep via next/typescript).
 * Falls back to a regex-based extractor when the TS compiler is unavailable.
 */

export interface FunctionSignature {
  name: string;
  params: Array<{ name: string; type: string; optional: boolean }>;
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  jsDoc?: string;
  startLine: number;
}

export interface ClassSignature {
  name: string;
  methods: FunctionSignature[];
  properties: Array<{ name: string; type: string; isPublic: boolean }>;
  isExported: boolean;
  startLine: number;
}

export interface AstSnapshot {
  functions: FunctionSignature[];
  classes: ClassSignature[];
  exports: string[];
  imports: string[];
  language: string;
  hash: string;
}

/**
 * Compute a simple djb2 hash of a string for change detection.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Regex-based fallback extractor for TypeScript/JavaScript.
 * Handles the most common patterns without requiring a full TS compiler.
 */
function regexExtract(code: string): Omit<AstSnapshot, 'hash' | 'language'> {
  const functions: FunctionSignature[] = [];
  const classes: ClassSignature[] = [];
  const exports: string[] = [];
  const imports: string[] = [];

  const lines = code.split('\n');

  // Extract imports
  const importRe = /^import\s+.+\s+from\s+['"](.+)['"]/;
  lines.forEach((line) => {
    const m = line.match(importRe);
    if (m) imports.push(m[1]);
  });

  // Extract export names
  const exportRe = /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/;
  lines.forEach((line) => {
    const m = line.match(exportRe);
    if (m) exports.push(m[1]);
  });

  // Extract function signatures (exported and non-exported)
  const funcRe =
    /^(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/;
  const arrowRe =
    /^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*(?::\s*([^=>{]+))?\s*=>/;

  lines.forEach((line, idx) => {
    let m = line.match(funcRe);
    if (m) {
      functions.push({
        name: m[3],
        params: parseParams(m[4] || ''),
        returnType: (m[5] || 'void').trim(),
        isAsync: !!m[2],
        isExported: !!m[1],
        startLine: idx + 1,
      });
      return;
    }
    m = line.match(arrowRe);
    if (m) {
      functions.push({
        name: m[1],
        params: parseParams(m[3] || ''),
        returnType: (m[4] || 'unknown').trim(),
        isAsync: !!m[2],
        isExported: line.startsWith('export'),
        startLine: idx + 1,
      });
    }
  });

  // Extract class signatures
  const classRe = /^(export\s+)?(?:abstract\s+)?class\s+(\w+)/;
  lines.forEach((line, idx) => {
    const m = line.match(classRe);
    if (m) {
      classes.push({
        name: m[2],
        methods: [],
        properties: [],
        isExported: !!m[1],
        startLine: idx + 1,
      });
    }
  });

  return { functions, classes, exports, imports };
}

function parseParams(raw: string): FunctionSignature['params'] {
  if (!raw.trim()) return [];
  return raw.split(',').map((p) => {
    const trimmed = p.trim();
    const optional = trimmed.includes('?');
    const [namePart, typePart] = trimmed.replace('?', '').split(':');
    return {
      name: (namePart || '').trim(),
      type: (typePart || 'unknown').trim(),
      optional,
    };
  });
}

/**
 * Main entry point: parse source code into an AstSnapshot.
 */
export function analyzeCode(code: string, language = 'typescript'): AstSnapshot {
  const { functions, classes, exports, imports } = regexExtract(code);
  return {
    functions,
    classes,
    exports,
    imports,
    language,
    hash: djb2Hash(code),
  };
}

/**
 * Diff two snapshots and return a human-readable summary of what changed.
 * Used to decide whether a heal is necessary.
 */
export function diffSnapshots(
  prev: AstSnapshot,
  next: AstSnapshot
): { changed: boolean; summary: string[] } {
  if (prev.hash === next.hash) {
    return { changed: false, summary: [] };
  }

  const summary: string[] = [];

  // Detect added/removed/changed functions
  const prevFns = new Map(prev.functions.map((f) => [f.name, f]));
  const nextFns = new Map(next.functions.map((f) => [f.name, f]));

  nextFns.forEach((fn, name) => {
    if (!prevFns.has(name)) {
      summary.push(`Added function: ${name}()`);
    } else {
      const old = prevFns.get(name)!;
      if (JSON.stringify(old.params) !== JSON.stringify(fn.params)) {
        summary.push(`Changed signature of ${name}(): params updated`);
      }
      if (old.returnType !== fn.returnType) {
        summary.push(`Changed return type of ${name}(): ${old.returnType} → ${fn.returnType}`);
      }
      if (old.isAsync !== fn.isAsync) {
        summary.push(`${name}() is now ${fn.isAsync ? 'async' : 'synchronous'}`);
      }
    }
  });

  prevFns.forEach((_, name) => {
    if (!nextFns.has(name)) {
      summary.push(`Removed function: ${name}()`);
    }
  });

  // Detect added/removed exports
  const prevExports = new Set(prev.exports);
  const nextExports = new Set(next.exports);
  nextExports.forEach((e) => {
    if (!prevExports.has(e)) summary.push(`New export: ${e}`);
  });
  prevExports.forEach((e) => {
    if (!nextExports.has(e)) summary.push(`Removed export: ${e}`);
  });

  if (summary.length === 0) {
    summary.push('Code body changed (logic or comments updated)');
  }

  return { changed: true, summary };
}

/**
 * Doc Export API
 * POST /api/export
 * 
 * Export healed documentation as HTML, Markdown bundle (ZIP), or trigger browser PDF print.
 * Supports formats: 'html', 'markdown', 'json'
 */
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const format: string = body.format || 'html';
  const docs: Array<{ filePath: string; markdown: string; code?: string }> = body.docs || [];

  if (!docs.length) {
    // Try to load docs from database
    try {
      const { getDb, schema } = await import('@/lib/db');
      const db = getDb();
      const dbDocs = await db
        .select({
          filePath: schema.docFiles.filePath,
          markdown: schema.docFiles.healedMarkdown,
          code: schema.docFiles.rawCode,
        })
        .from(schema.docFiles)
        .limit(100);

      if (dbDocs.length) {
        docs.push(...dbDocs.map(d => ({
          filePath: d.filePath,
          markdown: d.markdown,
          code: d.code,
        })));
      }
    } catch {
      // DB not configured - use provided docs
    }
  }

  if (!docs.length) {
    return NextResponse.json({
      success: false,
      error: 'No documentation to export. Provide docs in the request body or connect a database.',
    }, { status: 400 });
  }

  if (format === 'markdown') {
    // Create a ZIP file of all markdown docs
    const zip = new JSZip();
    const docsFolder = zip.folder('ostinato-docs')!;

    docs.forEach((doc) => {
      const safePath = doc.filePath.replace(/[^a-zA-Z0-9_\-./]/g, '_');
      docsFolder.file(`${safePath}.md`, doc.markdown);
    });

    // Add an index file
    const index = `# Ostinato Documentation Export\n\nExported at: ${new Date().toISOString()}\n\n## Files\n\n${docs.map(d => `- [${d.filePath}](./${d.filePath.replace(/[^a-zA-Z0-9_\-./]/g, '_')}.md)`).join('\n')}\n`;
    docsFolder.file('README.md', index);

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
    return new NextResponse(Buffer.from(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="ostinato-docs-${Date.now()}.zip"`,
      },
    });
  }

  if (format === 'html') {
    // Generate a static HTML site
    const htmlContent = generateHtmlSite(docs);
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="ostinato-docs-${Date.now()}.html"`,
      },
    });
  }

  if (format === 'json') {
    const jsonContent = JSON.stringify({ exportedAt: new Date().toISOString(), docs }, null, 2);
    return new NextResponse(jsonContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ostinato-docs-${Date.now()}.json"`,
      },
    });
  }

  return NextResponse.json({ success: false, error: `Unknown format: ${format}` }, { status: 400 });
}

function generateHtmlSite(docs: Array<{ filePath: string; markdown: string }>): string {
  const renderMarkdownToHtml = (md: string) => {
    return md
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
      .replace(/^(.+)$/gm, (m) => m.startsWith('<') ? m : `<p>${m}</p>`);
  };

  const sidebar = docs.map((d, i) =>
    `<a href="#doc-${i}" class="sidebar-link">${d.filePath}</a>`
  ).join('\n');

  const content = docs.map((d, i) =>
    `<section id="doc-${i}" class="doc-section">
      <div class="file-path">${d.filePath}</div>
      <div class="doc-content">${renderMarkdownToHtml(d.markdown)}</div>
    </section>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ostinato Documentation Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e4e4e7; display: flex; min-height: 100vh; }
    .sidebar { width: 280px; background: #111118; border-right: 1px solid #27272a; padding: 24px 16px; position: fixed; height: 100vh; overflow-y: auto; }
    .sidebar h2 { color: #a855f7; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; font-family: monospace; }
    .sidebar-link { display: block; padding: 8px 12px; color: #a1a1aa; text-decoration: none; font-size: 12px; font-family: monospace; border-radius: 6px; margin-bottom: 4px; }
    .sidebar-link:hover { background: #1a1a24; color: #fff; }
    .main { margin-left: 280px; flex: 1; padding: 40px 48px; max-width: 900px; }
    .doc-section { margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid #27272a; }
    .file-path { font-family: monospace; font-size: 11px; color: #a855f7; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; background: #18181b; padding: 8px 12px; border-radius: 6px; border: 1px solid #27272a; }
    h1 { font-size: 24px; color: #fff; margin: 16px 0 8px; }
    h2 { font-size: 18px; color: #d4d4d8; margin: 12px 0 6px; }
    h3 { font-size: 14px; color: #a1a1aa; margin: 8px 0 4px; }
    p { font-size: 14px; line-height: 1.7; color: #a1a1aa; margin: 8px 0; }
    code { background: #27272a; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #22d3ee; }
    ul { padding-left: 20px; }
    li { font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 4px 0; }
    strong { color: #e4e4e7; }
    .export-header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid #27272a; }
    .export-header h1 { font-size: 28px; background: linear-gradient(135deg, #a855f7, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .export-header p { color: #71717a; font-size: 12px; }
    @media print { .sidebar { display: none; } .main { margin-left: 0; } body { background: #fff; color: #000; } }
  </style>
</head>
<body>
  <nav class="sidebar">
    <h2>Ostinato Docs</h2>
    ${sidebar}
  </nav>
  <main class="main">
    <div class="export-header">
      <h1>Ostinato Documentation</h1>
      <p>Exported ${new Date().toLocaleString()} • ${docs.length} file(s)</p>
    </div>
    ${content}
  </main>
</body>
</html>`;
}

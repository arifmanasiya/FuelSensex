import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const docsDir = resolve(process.cwd(), 'docs');
const indexPath = resolve(docsDir, 'index.html');
const fallbackPath = resolve(docsDir, '404.html');

try {
  const html = readFileSync(indexPath, 'utf8');
  writeFileSync(fallbackPath, html);
  console.log('[postbuild] Copied docs/index.html -> docs/404.html for SPA fallback.');
} catch (err) {
  console.error('[postbuild] Failed to copy index.html to 404.html:', err);
  process.exitCode = 1;
}

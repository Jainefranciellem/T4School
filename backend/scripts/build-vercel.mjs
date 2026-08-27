import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

// Everything from node_modules stays external (resolved normally at runtime by
// Vercel's file tracer) — only our own src/api code gets bundled into one file.
// This avoids Vercel's own function-detection/splitting logic ever seeing (and
// misidentifying) our internal modules as separate serverless functions.
const external = Object.keys(pkg.dependencies || {});

await build({
  entryPoints: ['src/vercel-handler.ts'],
  outfile: 'api/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external,
  logLevel: 'info',
});

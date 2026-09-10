// Mission 43 — pdfjs runs in the browser, so its worker and data files must be
// served as static assets. This copies them from the installed package into
// public/pdfjs/ before dev/build. public/pdfjs/ is generated (git-ignored), never
// committed: it always mirrors the installed pdfjs-dist version.
import { cp, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve('pdfjs-dist/package.json'));
const target = join(process.cwd(), 'public', 'pdfjs');

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

await cp(join(packageRoot, 'standard_fonts'), join(target, 'standard_fonts'), { recursive: true });
await cp(join(packageRoot, 'cmaps'), join(target, 'cmaps'), { recursive: true });
await cp(join(packageRoot, 'build', 'pdf.worker.min.mjs'), join(target, 'pdf.worker.min.mjs'));

console.log(`pdfjs assets copied to ${target}`);

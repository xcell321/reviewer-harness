// Cross-platform syntax check: runs `node --check` on every .js file
// under bin/ and lib/ (recursively), without a POSIX `for` loop or shell
// glob. Walks the folders in Node, so no hardcoded file list to maintain
// and identical behaviour on every OS.
import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = [...walk(path.join(root, 'bin')), ...walk(path.join(root, 'lib'))].sort();

if (files.length === 0) {
  console.error('check-syntax: no .js files found under bin/ or lib/');
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if ((result.status ?? 1) !== 0) {
    console.error(`check-syntax: FAILED ${path.relative(root, file)}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`check-syntax: ${failed} of ${files.length} file(s) failed`);
  process.exit(1);
}
console.log(`check-syntax: ${files.length} file(s) OK`);

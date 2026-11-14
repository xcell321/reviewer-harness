// Cross-platform test launcher: runs every tests/*.test.js file with
// `node --test`, without relying on shell glob expansion (which cmd.exe
// on Windows does not do). Lists the files in Node and passes them
// explicitly, so the exact same test set runs on every OS.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(root, 'tests');

const files = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.js'))
  .sort()
  .map((f) => path.join(testsDir, f));

if (files.length === 0) {
  console.error('run-tests: no *.test.js files found in tests/');
  process.exit(1);
}

console.log(`run-tests: running ${files.length} test file(s)`);
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);

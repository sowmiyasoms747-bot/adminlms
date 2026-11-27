// Syntax check for every shipped and test script (the project has no bundler or linter dependency).
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const roots = ['js', 'tests', 'scripts', 'scorm-sw.js'];
const files = [];
const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).forEach((f) => walk(join(p, f))) : /\.(m?js)$/.test(p) && files.push(p));
roots.forEach(walk);
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) { failed++; console.error(r.stderr); }
}
console.log(`${files.length - failed}/${files.length} files passed syntax check`);
process.exit(failed ? 1 : 0);

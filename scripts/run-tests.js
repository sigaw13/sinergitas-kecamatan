'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const testDirectory = path.join(root, 'tests');
const files = fs.readdirSync(testDirectory)
  .filter(name => name.endsWith('.test.js'))
  .sort();

let failed = 0;
for (const file of files) {
  process.stdout.write(`\n▶ ${file}\n`);
  const result = spawnSync(process.execPath, [path.join(testDirectory, file)], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });
  if (result.status !== 0) failed += 1;
}

if (failed) {
  console.error(`\n❌ ${failed} berkas pengujian gagal.`);
  process.exit(1);
}

console.log(`\n✅ ${files.length} berkas pengujian lulus.`);

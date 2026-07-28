#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  batches,
  checksumGroups,
  evidenceDirStatus,
  readChecksumFile,
  repoRoot,
  validationDate,
} from './v2_validation_data.mjs';

const checksumResults = checksumGroups.map((group) => {
  const files = readChecksumFile(group.checksumFile);
  return {
    ...group,
    files,
    ok: files.every((file) => file.ok),
  };
});

const batchResults = batches.map((batch) => {
  const sampleStates = batch.samples.map((relativePath) => {
    const absolutePath = path.join(repoRoot, relativePath);
    return {
      path: relativePath,
      exists: fs.existsSync(absolutePath),
      sizeBytes: fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : null,
    };
  });
  const evidenceDirs = batch.evidenceDirs.map(evidenceDirStatus);
  return {
    ...batch,
    sampleStates,
    evidenceDirs,
    ok: sampleStates.every((item) => item.exists) && evidenceDirs.every((dir) => dir.exists),
  };
});

const summary = {
  date: validationDate,
  ok: checksumResults.every((group) => group.ok) && batchResults.every((batch) => batch.ok),
  checksumGroups: checksumResults,
  batches: batchResults,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 1);
}

console.log('墨览 V2 外部批次预检');
console.log(`日期：${validationDate}`);
console.log('');
for (const group of checksumResults) {
  console.log(`${group.ok ? '✓' : '✗'} ${group.title}`);
  for (const file of group.files) {
    const status = file.ok ? 'ok' : (file.exists ? 'hash-mismatch' : 'missing');
    console.log(`  - ${file.relativePath} [${status}] ${file.sizeBytes ?? '-'} B`);
  }
}
console.log('');
for (const batch of batchResults) {
  console.log(`${batch.ok ? '✓' : '✗'} ${batch.title} (${batch.tasks.join(', ')})`);
  for (const sample of batch.sampleStates) {
    console.log(`  sample: ${sample.path} ${sample.exists ? `${sample.sizeBytes} B` : 'missing'}`);
  }
  for (const dir of batch.evidenceDirs) {
    console.log(`  evidence: ${dir.path} ${dir.exists ? `${dir.fileCount} entries` : 'missing'}`);
  }
}

process.exit(summary.ok ? 0 : 1);

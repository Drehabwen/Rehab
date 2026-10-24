const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  listResearchBatches,
  readResearchBatch,
  researchExportsRoot,
  writeResearchPackage,
} = require('./galen-research-export.cjs');

const samplePackage = {
  schema: 'rehab-research/1',
  batchId: 'batch-20261020-120000-abcd',
  exportedAt: Date.UTC(2026, 9, 20, 4, 0, 0),
  since: null,
  coverage: { from: 1700000000000, to: 1700000002000 },
  counts: { visit: 1, assessment: 1, session_report: 0, patients: 1, documents: 0 },
  quality: { patients: 1, assessments: 1 },
  files: [
    { name: 'patients.jsonl', content: '{"rehabId":"RID-CS-2418","createdAt":1700000000000}\n' },
    { name: 'events.jsonl', content: '{"eventId":"visit-s-1","rehabId":"RID-CS-2418","type":"visit"}\n' },
    { name: 'documents.jsonl', content: '' },
  ],
};

test('writeResearchPackage 写入原子批次并计算 sha256', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'research-export-'));
  const result = await writeResearchPackage(samplePackage, root);

  assert.equal(result.batchId, samplePackage.batchId);
  assert.ok(result.path.startsWith(researchExportsRoot(root)));
  const manifest = JSON.parse(fs.readFileSync(path.join(result.path, 'manifest.json'), 'utf8'));
  assert.equal(manifest.schema, 'rehab-research/1');
  assert.equal(manifest.files.length, 3);
  assert.match(manifest.files[1].sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.files[1].lines, 1);
  assert.equal(manifest.counts.assessment, 1);
  fs.rmSync(root, { recursive: true, force: true });
});

test('listResearchBatches 按 exportedAt 倒序，忽略不完整批次', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'research-list-'));
  await writeResearchPackage(samplePackage, root);
  await writeResearchPackage(
    { ...samplePackage, batchId: 'batch-20261021-090000-wxyz', exportedAt: Date.UTC(2026, 9, 21, 1, 0, 0) },
    root,
  );
  fs.mkdirSync(path.join(researchExportsRoot(root), 'batch-20261022-090000-broken'), { recursive: true });

  const batches = await listResearchBatches(root);
  assert.deepEqual(batches.map((batch) => batch.batchId), [
    'batch-20261021-090000-wxyz',
    'batch-20261020-120000-abcd',
  ]);
  fs.rmSync(root, { recursive: true, force: true });
});

test('readResearchBatch 校验哈希，拒绝含姓名等私密字段的包', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'research-read-'));
  const result = await writeResearchPackage(samplePackage, root);
  const batch = await readResearchBatch(samplePackage.batchId, root);
  assert.equal(batch.manifest.batchId, samplePackage.batchId);
  assert.ok(batch.files['events.jsonl'].includes('visit-s-1'));

  // 篡改文件 → 校验失败
  fs.writeFileSync(path.join(result.path, 'events.jsonl'), '{"eventId":"tampered"}\n', 'utf8');
  await assert.rejects(() => readResearchBatch(samplePackage.batchId, root), /校验失败/);

  // 含私密字段 → 拒绝写入
  await assert.rejects(
    () => writeResearchPackage({
      ...samplePackage,
      batchId: 'batch-20261023-090000-leak',
      files: [{ name: 'events.jsonl', content: '{"eventId":"x","name":"陈志远"}\n' }],
    }, root),
    /私密字段/,
  );
  fs.rmSync(root, { recursive: true, force: true });
});

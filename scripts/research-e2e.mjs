/**
 * 数据流通端到端演练（RehabMain → Galen）。
 *
 *   node scripts/research-e2e.mjs
 *
 * 步骤：
 * 1. 用 esbuild 把真实的构建模块（src/services/research/build.ts）打成临时 ESM；
 * 2. 用真实临床样本数据生成批次（含文书脱敏、RehabID、事件流）；
 * 3. 交给桌面端 `galen-research-export.cjs` 原子落盘（临时 LOCALAPPDATA）；
 * 4. 交给 Galen `galen-workspace/lib/research.js` 导入（临时 DSH_HOME）；
 * 5. 校验批次、幂等、汇总，并打印结果。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(import.meta.dirname, '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-e2e-'));
const bundleDir = path.join(repoRoot, '.tmp');
fs.mkdirSync(bundleDir, { recursive: true });
// 放在仓库内，才能解析 node_modules（dexie 等 external 依赖）
const bundleFile = path.join(bundleDir, 'research-build.mjs');

const GALEN_RESEARCH = 'C:/Users/DORAT/Desktop/dsh-plugins/galen-workspace/lib/research.js';
const GALEN_ANALYSIS = 'C:/Users/DORAT/Desktop/dsh-plugins/galen-workspace/lib/analysis.js';

function assert(condition, message) {
  if (!condition) throw new Error(`E2E 断言失败：${message}`);
}

await build({
  entryPoints: [path.join(repoRoot, 'src/services/research/build.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundleFile,
  alias: { '@': path.join(repoRoot, 'src') },
  external: ['dexie'],
  logLevel: 'silent',
});

const { buildResearchPackage } = await import(`file:///${bundleFile.replace(/\\/g, '/')}`);
const exportModule = require(path.join(repoRoot, 'desktop/galen-research-export.cjs'));
const galen = await import(`file:///${GALEN_RESEARCH.replace(/\\/g, '/')}`);
const galenAnalysis = await import(`file:///${GALEN_ANALYSIS.replace(/\\/g, '/')}`);

const source = {
  patients: [
    { id: 'p-1', shortCode: 'CS-2418', name: '陈志远', createdAt: 1700000000000, updatedAt: 1700000000000 },
    { id: 'p-2', shortCode: 'CS-2421', name: '林慧敏', createdAt: 1700000100000, updatedAt: 1700000100000 },
  ],
  sessions: [
    { id: 's-1', patientId: 'p-1', sequence: 1, createdAt: 1700000200000, updatedAt: 1700000200000, status: 'completed', assessments: [], isBaseline: true },
    { id: 's-2', patientId: 'p-2', sequence: 1, createdAt: 1700000300000, updatedAt: 1700000300000, status: 'active', assessments: [] },
    { id: 's-3', patientId: 'p-1', sequence: 2, createdAt: 1700000600000, updatedAt: 1700000600000, status: 'completed', assessments: [] },
    { id: 's-4', patientId: 'p-2', sequence: 2, createdAt: 1700000700000, updatedAt: 1700000700000, status: 'completed', assessments: [] },
  ],
  assessments: [
    { id: 'a-1', sessionId: 's-1', patientId: 'p-1', type: 'posture', mode: 'quick', status: 'completed', createdAt: 1700000210000, data: { posture: { metrics: { headForward: 12 } } } },
    { id: 'a-2', sessionId: 's-1', patientId: 'p-1', type: 'rom', mode: 'quick', status: 'completed', createdAt: 1700000220000, data: { rom: { items: [{ joint: 'knee', direction: 'flexion', side: 'left', angle: 118 }] } } },
    { id: 'a-3', sessionId: 's-2', patientId: 'p-2', type: 'scale', mode: 'quick', status: 'completed', createdAt: 1700000310000, data: { scale: { scaleId: 'FMA-UE', totalScore: 42 } } },
    { id: 'a-4', sessionId: 's-3', patientId: 'p-1', type: 'posture', mode: 'quick', status: 'completed', createdAt: 1700000610000, data: { posture: { metrics: { headForward: 9 } } } },
    { id: 'a-5', sessionId: 's-4', patientId: 'p-2', type: 'scale', mode: 'quick', status: 'completed', createdAt: 1700000710000, data: { scale: { scaleId: 'FMA-UE', totalScore: 48 } } },
  ],
  reports: [
    {
      id: 'r-1', sessionId: 's-1', patientId: 'p-1', createdAt: 1700000230000,
      markdown: '## 陈志远\n头前伸 12°，建议胸椎伸展训练。',
      insights: ['陈志远 头前伸改善 2°'],
      recommendations: ['陈志远 每周 2 次肩胛稳定训练'],
      sourceAssessmentIds: ['a-1', 'a-2'],
    },
  ],
};

const pkg = buildResearchPackage(source, {
  batchId: 'batch-20261020-120000-e2e1',
  exportedAt: 1700000400000,
  since: null,
});

const written = await exportModule.writeResearchPackage(
  {
    schema: 'rehab-research/1',
    batchId: pkg.batchId,
    exportedAt: pkg.exportedAt,
    since: pkg.since,
    coverage: pkg.coverage,
    counts: pkg.counts,
    quality: pkg.quality,
    files: pkg.files.map((file) => ({ name: file.name, content: file.content })),
  },
  tempDir,
);
assert(fs.existsSync(path.join(written.path, 'manifest.json')), 'manifest 已落盘');

const exportsRoot = exportModule.researchExportsRoot(tempDir);
const batches = galen.listBatches(exportsRoot);
assert(batches.length === 1, `Galen 能列出批次（实际 ${batches.length}）`);
assert(batches[0].batchId === pkg.batchId, '批次 ID 一致');

const importResult = galen.importBatch(pkg.batchId, { root: exportsRoot, home: path.join(tempDir, 'home') });
assert(importResult.imported === pkg.counts.visit + pkg.counts.assessment + pkg.counts.session_report, '事件全部导入');

const summary = galen.researchSummary(path.join(tempDir, 'home'));
assert(summary.patients === 2, '患者数（RehabID）');
assert(summary.byType.assessment === pkg.counts.assessment, '评估事件数');
assert(summary.moduleCoverage.posture === 2 && summary.moduleCoverage.rom === 1 && summary.moduleCoverage.scale === 2, '模块覆盖');
assert(summary.documents === 1, '文书数');

const again = galen.importBatch(pkg.batchId, { root: exportsRoot, home: path.join(tempDir, 'home') });
assert(again.imported === 0, '重复导入幂等');

// 队列发现 → 选题候选 → 数据缺口
const homeDir = path.join(tempDir, 'home');
const analysis = galenAnalysis.analyzeResearch(homeDir);
assert(analysis.patients === 2, '分析识别患者数');
assert(analysis.topics.length >= 1, '产出至少一个选题候选');
assert(analysis.topics[0].feasibility.score > 0, '选题带可行性评分');
assert(analysis.cohorts.find((cohort) => cohort.id === 'cohort-followup').size === 2, '识别有随访的队列（两位患者均两次接诊）');

const patientLines = fs.readFileSync(path.join(written.path, 'patients.jsonl'), 'utf8');
assert(!patientLines.includes('陈志远'), '患者文件不含真实姓名');
const documentLines = fs.readFileSync(path.join(written.path, 'documents.jsonl'), 'utf8');
assert(documentLines.includes('RID-CS-2418') && !documentLines.includes('陈志远'), '文书已脱敏为 RehabID');

console.log(JSON.stringify({
  batch: written.batchId,
  path: written.path,
  bytes: written.bytes,
  counts: pkg.counts,
  galen: {
    imported: importResult.imported,
    patients: summary.patients,
    events: summary.events,
    documents: summary.documents,
    byType: summary.byType,
    moduleCoverage: summary.moduleCoverage,
    coverage: summary.coverage,
  },
  analysis: {
    cohorts: analysis.cohorts.map((cohort) => ({ id: cohort.id, size: cohort.size })),
    topics: analysis.topics.map((item) => ({
      id: item.id,
      title: item.title,
      design: item.design,
      n: item.n,
      score: item.feasibility.score,
      reasons: item.feasibility.reasons,
      nextActions: item.nextActions,
    })),
    gaps: {
      noFollowUp: analysis.gaps.noFollowUp,
      noDocument: analysis.gaps.noDocument,
      noOutcomeDelta: analysis.gaps.noOutcomeDelta,
    },
  },
  idempotent: again.imported === 0,
}, null, 2));

fs.rmSync(tempDir, { recursive: true, force: true });
fs.rmSync(bundleFile, { force: true });
console.log('\nE2E OK：RehabMain 批次 → Galen 导入 → 汇总 全链路通过');

/**
 * Galen 研究数据导出（桌面端落地部分）。
 *
 * 目录：%LOCALAPPDATA%\Rehab\GalenConnector\exports\<batchId>\
 *   manifest.json    批次元数据 + 每个文件的 sha256 / 字节数 / 行数
 *   patients.jsonl
 *   events.jsonl
 *   documents.jsonl
 *
 * 规则：
 * - 原子写入（先写 .tmp 目录，再 rename）；
 * - 写入前二次校验：只允许安全字段，拒绝姓名等私密字段；
 * - 单文件 ≤ 20MB，整批 ≤ 50MB；
 * - 幂等：同 batchId 已存在时覆盖（同日重导出不会产生重复目录）。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PACKAGE_SCHEMA = 'rehab-research/1';
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

const forbiddenKeys = new Set([
  'name', 'notes', 'noteshtml', 'phone', 'idcard', 'idnumber', 'address',
  'markdownreport', 'transcript', 'answers', 'snapshotimage', 'patientinfo',
]);

function researchExportsRoot(localAppData = process.env.LOCALAPPDATA) {
  if (!localAppData) throw new Error('LOCALAPPDATA is unavailable');
  return path.join(localAppData, 'Rehab', 'GalenConnector', 'exports');
}

function batchDirectory(batchId, localAppData) {
  if (!/^batch-[0-9]{8}-[0-9]{6}-[a-z0-9]{4,8}$/.test(batchId)) {
    throw new Error(`非法 batchId：${batchId}`);
  }
  return path.join(researchExportsRoot(localAppData), batchId);
}

function assertSafeRecord(record, label) {
  const walk = (value, fieldPath) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${fieldPath}[${index}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKeys.has(key.toLowerCase())) {
        throw new Error(`研究数据导出拒绝私密字段：${fieldPath}.${key}`);
      }
      walk(item, `${fieldPath}.${key}`);
    }
  };
  walk(record, label);
}

function validatePackage(pkg) {
  if (!pkg || pkg.schema !== PACKAGE_SCHEMA) throw new Error('研究包 schema 不匹配');
  if (typeof pkg.batchId !== 'string') throw new Error('研究包缺少 batchId');
  if (!Array.isArray(pkg.files) || pkg.files.length === 0) throw new Error('研究包缺少文件');
  if (!pkg.files.some((file) => file.name === 'events.jsonl')) throw new Error('研究包必须包含 events.jsonl');

  let totalBytes = 0;
  const prepared = pkg.files.map((file) => {
    if (typeof file.name !== 'string' || path.basename(file.name) !== file.name) {
      throw new Error(`非法文件名：${file.name}`);
    }
    if (typeof file.content !== 'string') throw new Error(`文件内容必须是字符串：${file.name}`);
    const bytes = Buffer.byteLength(file.content, 'utf8');
    if (bytes > MAX_FILE_BYTES) throw new Error(`文件超过 20MB：${file.name}`);
    totalBytes += bytes;

    // JSONL 逐行校验：必须是对象且不含私密字段
    const lines = file.content.split('\n').filter((line) => line.trim().length > 0);
    for (const [index, line] of lines.entries()) {
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        throw new Error(`${file.name} 第 ${index + 1} 行不是合法 JSON`);
      }
      assertSafeRecord(record, `${file.name}[${index}]`);
    }

    return {
      name: file.name,
      content: file.content,
      bytes,
      lines: lines.length,
      sha256: crypto.createHash('sha256').update(file.content, 'utf8').digest('hex'),
    };
  });

  if (totalBytes > MAX_TOTAL_BYTES) throw new Error('研究包超过 50MB');
  return prepared;
}

async function writeResearchPackage(pkg, localAppData) {
  const files = validatePackage(pkg);
  const target = batchDirectory(pkg.batchId, localAppData);
  const parent = path.dirname(target);
  await fs.promises.mkdir(parent, { recursive: true });

  const manifest = {
    schema: PACKAGE_SCHEMA,
    batchId: pkg.batchId,
    exportedBy: 'rehab-workbench',
    exportedAt: pkg.exportedAt ?? Date.now(),
    since: pkg.since ?? null,
    coverage: pkg.coverage ?? { from: null, to: null },
    counts: pkg.counts ?? {},
    quality: pkg.quality ?? {},
    files: files.map(({ name, bytes, sha256, lines }) => ({ name, bytes, sha256, lines })),
    note: pkg.note ?? 'RehabMain 研究数据批次（去标识）',
  };

  const staging = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.promises.mkdir(staging, { recursive: true });
    for (const file of files) {
      await fs.promises.writeFile(path.join(staging, file.name), file.content, { encoding: 'utf8', mode: 0o600 });
    }
    await fs.promises.writeFile(path.join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    await fs.promises.rm(target, { recursive: true, force: true });
    await fs.promises.rename(staging, target);
  } finally {
    await fs.promises.rm(staging, { recursive: true, force: true }).catch(() => {});
  }

  return {
    path: target,
    batchId: pkg.batchId,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    files: manifest.files,
    counts: manifest.counts,
  };
}

async function listResearchBatches(localAppData) {
  const root = researchExportsRoot(localAppData);
  let entries = [];
  try {
    entries = await fs.promises.readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
  const batches = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('batch-')) continue;
    const manifestPath = path.join(root, entry.name, 'manifest.json');
    try {
      const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
      if (manifest?.schema !== PACKAGE_SCHEMA) continue;
      batches.push({
        batchId: manifest.batchId,
        exportedAt: manifest.exportedAt,
        counts: manifest.counts ?? {},
        quality: manifest.quality ?? {},
        files: manifest.files ?? [],
        path: path.join(root, entry.name),
      });
    } catch {
      // 不完整的批次（正在写入 / 被中断）直接忽略
    }
  }
  return batches.sort((a, b) => (b.exportedAt ?? 0) - (a.exportedAt ?? 0));
}

async function readResearchBatch(batchId, localAppData) {
  const directory = batchDirectory(batchId, localAppData);
  const manifest = JSON.parse(await fs.promises.readFile(path.join(directory, 'manifest.json'), 'utf8'));
  const files = {};
  for (const file of manifest.files ?? []) {
    const content = await fs.promises.readFile(path.join(directory, file.name), 'utf8');
    const sha256 = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    if (sha256 !== file.sha256) throw new Error(`文件校验失败：${file.name}`);
    files[file.name] = content;
  }
  return { manifest, files, path: directory };
}

module.exports = {
  PACKAGE_SCHEMA,
  batchDirectory,
  listResearchBatches,
  readResearchBatch,
  researchExportsRoot,
  writeResearchPackage,
};

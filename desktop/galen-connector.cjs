const fs = require('fs');
const path = require('path');

const forbiddenConnectorKeys = new Set([
  'name', 'notes', 'snapshotimage', 'markdownreport', 'auxiliarydiagnosis',
  'medvoice', 'cobbangleestimate', 'answers', 'landmarks', 'issues',
  'recommendations', 'aiinterpretation', 'transcript', 'patientinfo', 'structuredcase',
]);

function assertSafeConnectorPayload(value, pathLabel = 'snapshot') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeConnectorPayload(item, `${pathLabel}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenConnectorKeys.has(key.toLowerCase())) {
      throw new Error(`Galen connector rejected private field at ${pathLabel}.${key}`);
    }
    assertSafeConnectorPayload(item, `${pathLabel}.${key}`);
  }
}

function connectorSnapshotPath(localAppData = process.env.LOCALAPPDATA) {
  if (!localAppData) throw new Error('LOCALAPPDATA is unavailable');
  return path.join(localAppData, 'Rehab', 'GalenConnector', 'latest.json');
}

async function publishGalenSnapshot(snapshot, localAppData) {
  if (!snapshot || snapshot.connectorSchema !== 'rehab-workbench/1'
      || !Array.isArray(snapshot.patients) || !Array.isArray(snapshot.sessions)
      || !Array.isArray(snapshot.assessments)) {
    throw new Error('Invalid Galen connector snapshot');
  }
  assertSafeConnectorPayload(snapshot);
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  const bytes = Buffer.byteLength(json, 'utf8');
  if (bytes > 20 * 1024 * 1024) throw new Error('Galen connector snapshot exceeds 20 MB');

  const target = connectorSnapshotPath(localAppData);
  const directory = path.dirname(target);
  const temporary = path.join(directory, `latest.${process.pid}.${Date.now()}.tmp`);
  await fs.promises.mkdir(directory, { recursive: true });
  try {
    await fs.promises.writeFile(temporary, json, { encoding: 'utf8', mode: 0o600 });
    await fs.promises.rename(temporary, target);
  } finally {
    await fs.promises.rm(temporary, { force: true }).catch(() => {});
  }
  return { path: target, bytes };
}

async function getGalenConnectorStatus(localAppData) {
  const target = connectorSnapshotPath(localAppData);
  try {
    const stat = await fs.promises.stat(target);
    return {
      available: stat.isFile(),
      path: target,
      bytes: stat.size,
      lastModified: stat.mtimeMs,
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { available: false, path: target, bytes: 0, lastModified: null };
    }
    throw error;
  }
}

async function readGalenResearchFeedback(localAppData) {
  const target = connectorSnapshotPath(localAppData).replace(/latest\.json$/i, 'feedback.json');
  try {
    const stat = await fs.promises.stat(target);
    if (stat.size > 10 * 1024 * 1024) throw new Error('Galen research feedback exceeds 10 MB');
    const feedback = JSON.parse(await fs.promises.readFile(target, 'utf8'));
    if (feedback?.schemaVersion !== 1 || feedback?.connectorId !== 'rehab-workbench' || !Array.isArray(feedback.items)) {
      throw new Error('Invalid Galen research feedback');
    }
    return feedback;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { schemaVersion: 1, connectorId: 'rehab-workbench', generatedAt: null, items: [] };
    }
    throw error;
  }
}

module.exports = {
  assertSafeConnectorPayload,
  connectorSnapshotPath,
  getGalenConnectorStatus,
  publishGalenSnapshot,
  readGalenResearchFeedback,
};

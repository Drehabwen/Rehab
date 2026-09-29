const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { getGalenConnectorStatus, publishGalenSnapshot, readGalenResearchFeedback } = require('./galen-connector.cjs');

const validSnapshot = {
  version: '1.0.0',
  connectorSchema: 'rehab-workbench/1',
  exportedAt: 100,
  patients: [{ id: 'opaque-1', shortCode: 'RID-001' }],
  sessions: [{ id: 'session-1', patientId: 'opaque-1', createdAt: 90 }],
  assessments: [{
    id: 'assessment-1', patientId: 'opaque-1', sessionId: 'session-1',
    createdAt: 95, data: { adams: { atrDegrees: 6.5 } },
  }],
};

test('writes the Galen bridge to the exact local-app-data contract', async (context) => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'rehab-galen-connector-'));
  context.after(() => fs.promises.rm(root, { recursive: true, force: true }));

  const result = await publishGalenSnapshot(validSnapshot, root);
  assert.equal(result.path, path.join(root, 'Rehab', 'GalenConnector', 'latest.json'));
  assert.deepEqual(JSON.parse(await fs.promises.readFile(result.path, 'utf8')), validSnapshot);
  const updatedSnapshot = { ...validSnapshot, exportedAt: 101 };
  const updatedResult = await publishGalenSnapshot(updatedSnapshot, root);
  assert.deepEqual(JSON.parse(await fs.promises.readFile(result.path, 'utf8')), updatedSnapshot);
  assert.deepEqual(
    (await fs.promises.readdir(path.dirname(result.path))).filter(name => name.endsWith('.tmp')),
    [],
  );
  assert.deepEqual(await getGalenConnectorStatus(root), {
    available: true,
    path: result.path,
    bytes: updatedResult.bytes,
    lastModified: (await fs.promises.stat(result.path)).mtimeMs,
  });
});

test('rejects private fields even if the renderer is compromised', async () => {
  await assert.rejects(
    publishGalenSnapshot({ ...validSnapshot, patients: [{ id: 'opaque-1', name: 'private' }] }, os.tmpdir()),
    /rejected private field/,
  );
});

test('reads Galen review decisions as research execution items', async (context) => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'rehab-galen-feedback-'));
  context.after(() => fs.promises.rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'Rehab', 'GalenConnector');
  await fs.promises.mkdir(directory, { recursive: true });
  const feedback = {
    schemaVersion: 1,
    connectorId: 'rehab-workbench',
    generatedAt: 101,
    items: [{
      feedbackId: 'review-1', rehabId: 'RID-001', sourceAssessmentId: 'assessment-1',
      observationId: 'obs-1', metric: 'adams_atr_deg', action: 'reject',
      followUpAction: 'recapture', reason: '重新采集该时间点', reviewer: 'researcher-1',
      reviewedAt: '2026-09-29T00:00:00Z', previousValue: 8, previousUnit: 'deg',
      resultingValue: 8, resultingUnit: 'deg', resultingStatus: 'rejected',
    }],
  };
  await fs.promises.writeFile(path.join(directory, 'feedback.json'), JSON.stringify(feedback));

  assert.deepEqual(await readGalenResearchFeedback(root), feedback);
});

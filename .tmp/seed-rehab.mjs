/**
 * 通过 CDP 向桌面端 IndexedDB 注入演示数据（24 位患者 / 多次接诊 / 评估 / 文书）。
 * 用法：先带 --remote-debugging-port=9333 启动应用，再 node .tmp/seed-rehab.mjs
 */
const CDP_PORT = Number(process.argv[2] ?? 9333);
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const base = now - 210 * DAY;

const NAMES = ['陈志远', '林慧敏', '王建国', '赵一鸣', '周雅琴', '孙立群', '吴文昊', '郑晓雯',
  '冯振华', '许静怡', '何俊杰', '高丽娜', '罗天成', '梁诗涵', '宋子墨', '唐雨欣',
  '韩明轩', '曹佳琪', '邓浩然', '范思远', '彭若曦', '曾庆豪', '萧文博', '田若彤'];

let seed = 7;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const between = (min, max) => min + rand() * (max - min);
const pick = (min, max) => Math.round(between(min, max));

const patients = [];
const sessions = [];
const assessments = [];
const sessionReports = [];

for (let i = 0; i < 24; i += 1) {
  const patientId = `demo-p${String(i + 1).padStart(2, '0')}`;
  const shortCode = `CS-${2501 + i}`;
  const name = NAMES[i % NAMES.length];
  const startAt = base + i * 2 * DAY;
  patients.push({
    id: patientId,
    shortCode,
    name,
    createdAt: startAt,
    updatedAt: startAt,
    tags: i % 4 === 0 ? ['术后'] : i % 3 === 0 ? ['随访'] : [],
  });

  const visitCount = i % 3 === 0 ? 1 : (i % 3 === 1 ? 2 : 3);
  for (let visit = 1; visit <= visitCount; visit += 1) {
    const sessionId = `${patientId}-s${visit}`;
    const occurredAt = startAt + (visit - 1) * 28 * DAY + pick(0, 3) * DAY;
    const isLast = visit === visitCount;
    sessions.push({
      id: sessionId,
      patientId,
      sequence: visit,
      createdAt: occurredAt,
      updatedAt: occurredAt,
      status: isLast ? 'completed' : 'completed',
      isBaseline: visit === 1,
      assessments: [],
      notes: visit === 1 ? '首次评估' : `第 ${visit} 次随访`,
    });

    const improve = visit - 1;
    assessments.push({
      id: `${sessionId}-posture`,
      sessionId,
      patientId,
      type: 'posture',
      mode: 'stepped',
      createdAt: occurredAt + 2 * 3600 * 1000,
      status: 'completed',
      isBaseline: visit === 1,
      data: {
        posture: {
          mode: 'stepped',
          view: 'front',
          confidence: Number(between(0.82, 0.96).toFixed(2)),
          metrics: {
            headForward: Number((between(12, 22) - improve * between(1.2, 2.6)).toFixed(1)),
            shoulderAngle: Number((between(4, 12) - improve * 0.9).toFixed(1)),
            hipAngle: Number((between(3, 10) - improve * 0.7).toFixed(1)),
            atrAngle: Number((between(2, 9) - improve * 0.6).toFixed(1)),
          },
        },
      },
    });

    if (i % 4 !== 3) {
      assessments.push({
        id: `${sessionId}-rom`,
        sessionId,
        patientId,
        type: 'rom',
        mode: 'stepped',
        createdAt: occurredAt + 3 * 3600 * 1000,
        status: 'completed',
        isBaseline: visit === 1,
        data: {
          rom: {
            items: [
              { joint: 'knee', direction: 'flexion', side: 'left', angle: Number(Math.min(140, between(96, 112) + improve * between(3, 6)).toFixed(1)), label: '左膝屈曲' },
              { joint: 'shoulder', direction: 'flexion', side: 'right', angle: Number(Math.min(170, between(118, 134) + improve * between(2, 5)).toFixed(1)), label: '右肩前屈' },
            ],
            summary: '关节活动度较上次改善',
            recommendations: ['维持当前训练强度'],
          },
        },
      });
    }

    if (i % 5 < 2) {
      const total = Math.round(Math.min(110, between(58, 78) + improve * 3));
      assessments.push({
        id: `${sessionId}-scale`,
        sessionId,
        patientId,
        type: 'scale',
        mode: 'stepped',
        createdAt: occurredAt + 4 * 3600 * 1000,
        status: 'completed',
        isBaseline: visit === 1,
        data: {
          scale: {
            scaleId: 'SRS-22',
            scaleName: 'SRS-22 脊柱侧弯患者问卷',
            filledBy: 'therapist',
            totalScore: total,
            maxScore: 110,
            percentageScore: Number(((total / 110) * 100).toFixed(1)),
            dimensions: {
              functionActive: Number(between(3.2, 4.6).toFixed(1)),
              pain: Number(between(3.4, 4.8).toFixed(1)),
              selfImage: Number(between(3.0, 4.4).toFixed(1)),
              mentalHealth: Number(between(3.5, 4.7).toFixed(1)),
              satisfaction: Number(between(3.4, 4.8).toFixed(1)),
            },
            answers: [],
            createdAt: occurredAt + 4 * 3600 * 1000,
          },
        },
      });
    }

    if (i % 10 < 6) {
      sessionReports.push({
        id: `${sessionId}-report`,
        sessionId,
        patientId,
        markdown: `## ${name} 第 ${visit} 次评估报告\n\n体态与关节活动度较上次有改善，建议维持当前训练方案并加强家庭训练。`,
        insights: ['体态指标改善', '关节活动度提升'],
        recommendations: ['每周 2–3 次训练', '2 周后复测'],
        createdAt: occurredAt + 6 * 3600 * 1000,
        sourceAssessmentIds: [`${sessionId}-posture`, `${sessionId}-rom`],
      });
    }
  }
}

const payload = { patients, sessions, assessments, sessionReports };

async function main() {
  let target = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const list = await res.json();
      target = list.find((item) => item.type === 'page');
      if (target) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!target) throw new Error('找不到调试页面，请确认应用以 --remote-debugging-port 启动');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const messageId = (id += 1);
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');

  const expression = `(async () => {
    const payload = ${JSON.stringify(payload)};
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('RehabDatabase');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stores = ['patients', 'sessions', 'assessments', 'sessionReports'];
    const tx = db.transaction(stores, 'readwrite');
    for (const store of stores) {
      const objectStore = tx.objectStore(store);
      for (const record of payload[store]) objectStore.put(record);
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return {
      patients: payload.patients.length,
      sessions: payload.sessions.length,
      assessments: payload.assessments.length,
      reports: payload.sessionReports.length,
    };
  })()`;

  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  console.log(JSON.stringify(result.result?.result?.value ?? result, null, 2));

  await send('Page.reload', { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 4000));
  ws.close();
  console.log('seed done, page reloaded');
}

await main();

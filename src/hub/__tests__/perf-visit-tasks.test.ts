import { describe, expect, it } from 'vitest';
import type { Assessment } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import { buildVisitTaskList, buildVisitTaskSummary } from '../workflow';

const PATIENTS = 1000;
const SESSIONS_PER_PATIENT = 3;
const ASSESSMENTS = 10000;

function makeData() {
  const patients: Patient[] = [];
  const sessionsByPatient = new Map<string, Session[]>();
  const assessments: Assessment[] = [];

  for (let i = 0; i < PATIENTS; i += 1) {
    const id = `pat_${i}`;
    patients.push({ id, name: `患者${i}`, createdAt: i, updatedAt: i } as unknown as Patient);
    const sessions: Session[] = [];
    for (let s = 1; s <= SESSIONS_PER_PATIENT; s += 1) {
      sessions.push({ id: `s_${i}_${s}`, patientId: id, sequence: s, status: 'active', createdAt: i * 10 + s, updatedAt: i * 10 + s } as unknown as Session);
    }
    sessionsByPatient.set(id, sessions);
  }

  for (let a = 0; a < ASSESSMENTS; a += 1) {
    const patientIndex = a % PATIENTS;
    const typePool: Assessment['type'][] = ['posture', 'rom', 'medvoice', 'scale'];
    const type = typePool[a % typePool.length];
    assessments.push({
      id: `as_${a}`,
      patientId: `pat_${patientIndex}`,
      sessionId: `s_${patientIndex}_3`,
      type,
      createdAt: a,
    } as unknown as Assessment);
  }

  return { patients, sessionsByPatient, assessments };
}

describe('visit task aggregation at scale', () => {
  const { patients, sessionsByPatient, assessments } = makeData();

  it('优化实现：1000 患者 / 10000 评估', () => {
    const start = performance.now();
    const list = buildVisitTaskList(patients, (id) => sessionsByPatient.get(id) ?? [], assessments);
    const elapsed = performance.now() - start;
    expect(list).toHaveLength(PATIENTS);
    expect(elapsed).toBeLessThan(80);
  });

  it('旧实现基线：每位患者全量 filter', () => {
    const start = performance.now();
    const legacy = patients.map((patient) => buildVisitTaskSummary(
      patient,
      sessionsByPatient.get(patient.id) ?? [],
      assessments.filter((assessment) => assessment.patientId === patient.id),
    ));
    const elapsed = performance.now() - start;
    expect(legacy).toHaveLength(PATIENTS);
  });
});

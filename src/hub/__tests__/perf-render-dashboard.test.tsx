import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Assessment } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import { DashboardView } from '../views/DashboardView';
import { buildVisitTaskList } from '../workflow';

function makeData(count: number) {
  const patients: Patient[] = [];
  const sessions = new Map<string, Session[]>();
  const assessments: Assessment[] = [];
  const types: Assessment['type'][] = ['posture', 'rom', 'medvoice', 'scale'];
  for (let i = 0; i < count; i += 1) {
    const id = `pat_${i}`;
    patients.push({ id, name: `患者${i}`, createdAt: i, updatedAt: i } as unknown as Patient);
    sessions.set(id, [{ id: `s_${i}`, patientId: id, sequence: 1, status: 'active', createdAt: i, updatedAt: i } as unknown as Session]);
    types.forEach((type, t) => assessments.push({ id: `a_${i}_${t}`, patientId: id, sessionId: `s_${i}`, type, createdAt: i } as unknown as Assessment));
  }
  return { patients, sessions, assessments };
}

describe('dashboard render cost', () => {
  for (const count of [200, 1000]) {
    it(`渲染 ${count} 张接诊卡`, () => {
      const { patients, sessions, assessments } = makeData(count);
      const visitTasks = buildVisitTaskList(patients, (id) => sessions.get(id) ?? [], assessments);
      const start = performance.now();
      const html = renderToStaticMarkup(
        React.createElement(DashboardView, {
          patients,
          visitTasks,
          stats: { totalPatients: count, pending: count, inProgress: 0, readyForReport: count },
          onSelectPatient: () => undefined,
          onNewPatient: () => undefined,
          onSearchPatient: () => undefined,
          onOpenSyncPanel: () => undefined,
        }),
      );
      expect(html.length).toBeGreaterThan(0);
    });
  }
});

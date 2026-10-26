import { useEffect, useMemo, useState } from 'react';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { buildVisitTaskList, type VisitTaskSummary } from '@/hub/workflow';

/** 移动端接诊列表数据：复用已优化的聚合（O(P+A)），只在数据变化时重算。 */
export function useMobileVisits() {
  const { patients, loadPatients } = usePatientStore();
  const { assessments, loadAssessments } = useAssessmentStore();
  const { sessions, loadSessions } = useSessionStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([loadPatients(), loadAssessments(), loadSessions()])
      .catch((error) => console.error('移动端加载接诊数据失败', error))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadPatients, loadAssessments, loadSessions]);

  const sessionsByPatient = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const bucket = map.get(session.patientId);
      if (bucket) bucket.push(session);
      else map.set(session.patientId, [session]);
    }
    return map;
  }, [sessions]);

  const tasks = useMemo<VisitTaskSummary[]>(
    () => buildVisitTaskList(patients, (id) => sessionsByPatient.get(id) ?? [], assessments),
    [patients, sessionsByPatient, assessments],
  );

  const stats = useMemo(() => {
    let pending = 0; let inProgress = 0; let ready = 0;
    for (const task of tasks) {
      if (task.reportReady) ready += 1;
      else if (task.hasAnyAssessment) inProgress += 1;
      else pending += 1;
    }
    return { total: tasks.length, pending, inProgress, ready };
  }, [tasks]);

  return { tasks, stats, loading };
}

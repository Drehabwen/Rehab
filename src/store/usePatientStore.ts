import { create } from 'zustand';
import { db } from '@/lib/db';
import type { Patient } from '@/types/patient';
import { generatePatientId } from '@/lib/session-utils';
import { formatPatientSearch } from '@/lib/patient-utils';
import type { SyncScreeningPayload } from '@/services/integrationService';
import type { Assessment, PostureAssessmentData, ScaleAssessmentData } from '@/types/assessment';
import { verifySUC } from '@/utils/suc-utils';


interface PatientState {
  patients: Patient[];
  currentPatient: Patient | null;
  isLoading: boolean;
  error: string | null;

  setCurrentPatient: (patient: Patient | null) => void;
  addPatient: (name?: string, predefinedId?: string) => Promise<Patient>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  loadPatients: () => Promise<void>;
  searchPatients: (query: string) => Patient[];
  getPatientById: (id: string) => Patient | undefined;
  importSquatLabScreening: (payload: SyncScreeningPayload, patientId?: string) => Promise<Patient>;
  importScaleAssessment: (patientId: string, scaleData: ScaleAssessmentData, sessionId?: string) => Promise<void>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  currentPatient: null,
  isLoading: false,
  error: null,

  setCurrentPatient: (patient) => set({ currentPatient: patient }),

  addPatient: async (name?: string, predefinedId?: string): Promise<Patient> => {
    set({ isLoading: true, error: null });

    let patientId = predefinedId || generatePatientId();
    let exists = await db.patients.get(patientId);
    let attempts = 0;

    while (exists && attempts < 100) {
      patientId = generatePatientId();
      exists = await db.patients.get(patientId);
      attempts += 1;
    }

    if (exists) {
      throw new Error('无法生成唯一患者编号，请重试');
    }

    const patient: Patient = {
      id: patientId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.patients.add(patient);

    set((state) => ({
      patients: [patient, ...state.patients],
      currentPatient: patient,
      isLoading: false,
    }));

    return patient;
  },

  updatePatient: async (id: string, updates: Partial<Patient>): Promise<void> => {
    set({ isLoading: true, error: null });

    const existing = await db.patients.get(id);
    if (!existing) {
      throw new Error('患者不存在');
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.patients.put(updated);

    set((state) => ({
      patients: state.patients.map((p) => (p.id === id ? updated : p)),
      currentPatient: state.currentPatient?.id === id ? updated : state.currentPatient,
      isLoading: false,
    }));
  },

  deletePatient: async (id: string): Promise<void> => {
    set({ isLoading: true, error: null });

    await db.patients.delete(id);
    await db.sessions.where('patientId').equals(id).delete();

    set((state) => ({
      patients: state.patients.filter((p) => p.id !== id),
      currentPatient: state.currentPatient?.id === id ? null : state.currentPatient,
      isLoading: false,
    }));
  },

  loadPatients: async () => {
    set({ isLoading: true, error: null });

    const patients = await db.patients.orderBy('createdAt').reverse().toArray();

    set({ patients, isLoading: false });
  },

  searchPatients: (query: string): Patient[] => {
    const { patients } = get();
    if (!query.trim()) return patients;

    return patients.filter((p) => formatPatientSearch(p, query));
  },

  getPatientById: (id) => {
    const { patients } = get();
    return patients.find((p) => p.id === id);
  },

  importSquatLabScreening: async (payload: SyncScreeningPayload, patientId?: string): Promise<Patient> => {
    set({ isLoading: true, error: null });
    try {
      let patient: Patient;

      if (patientId) {
        // Associate with existing patient
        const existing = await db.patients.get(patientId);
        if (!existing) throw new Error('关联患者不存在');
        
        const tags = Array.from(new Set([...(existing.tags || []), '来自早筛', '已关联早筛']));
        let updatedNotes = existing.notes || '';
        if (payload.integrated_report) {
          updatedNotes += `\n\n[已关联早筛记录 - ${new Date(payload.created_at).toLocaleDateString()}]\n综合风险: ${payload.integrated_report.overall_risk === 'low' ? '低风险' : '预警关注'}\n结论摘要: ${payload.integrated_report.summary}`;
        }
        
        patient = {
          ...existing,
          tags,
          notes: updatedNotes,
          updatedAt: Date.now()
        };
        await db.patients.put(patient);
      } else {
        // Create new patient
        // If the early screening ID is a valid SUC or legacy 4-letter clinic code, reuse it; otherwise generate a new one
        const isValidSUC = verifySUC(payload.subject.subject_id);
        const isValid4Letter = /^[A-Z]{4}$/.test(payload.subject.subject_id);
        const newPatientId = (isValidSUC || isValid4Letter) ? payload.subject.subject_id : generatePatientId();
        const tags = ['来自早筛', payload.integrated_report?.overall_risk === 'low' ? '体态优秀' : '脊柱侧弯预警'];
        const notes = `年龄: ${payload.subject.age ?? '未知'}岁 | 身高: ${payload.subject.height_cm ?? '未知'}cm | 性别: ${payload.subject.sex === 'male' ? '男' : payload.subject.sex === 'female' ? '女' : '未知'}\n早筛备注: ${payload.subject.notes || '无'}\n\n[早筛结论摘要]\n${payload.integrated_report?.summary || '暂无摘要'}`;
        
        patient = {
          id: newPatientId,
          name: payload.subject.display_name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags,
          notes
        };
        await db.patients.add(patient);
      }

      // Start clinical session mapping
      const sequence = await db.sessions.where('patientId').equals(patient.id).toArray().then(sessions => {
        if (sessions.length === 0) return 1;
        return Math.max(...sessions.map(s => s.sequence)) + 1;
      });

      const sessionId = generatePatientId() + '_S' + sequence; // Custom clinical format

      // Map early screening protocol results into clinical posture assessment
      const postureData: PostureAssessmentData = {
        mode: 'stepped',
        view: 'front',
        confidence: 0.95,
        auxiliaryDiagnosis: `
### 早筛会话详情
- **筛查会话**: ${payload.session_id}
- **受试者 ID**: ${payload.subject.subject_id}
- **筛查时间**: ${new Date(payload.created_at).toLocaleString()}
- **一致性级别**: ${payload.integrated_report?.consistency_level || '未知'}

### 筛查指标评估
${payload.protocol_results.map(r => `
#### 【${r.protocol === 'static_posture' ? '静态姿势' : r.protocol === 'adams_forward_bend' ? 'Adams前屈' : '深蹲'}】
- **评估状态**: ${r.status === 'completed' ? '正常完成' : '未完成'} (质量: ${r.capture_quality})
- **PSI 对称指数**: ${r.psi_score != null ? r.psi_score : '无'}
- **评估发现**: ${r.findings.join('；') || '未见异常'}
- **风险标识**: ${r.risk_flags.join('；') || '低风险'}
- **严重度等级**: ${r.severity_grades ? JSON.stringify(r.severity_grades) : '无'}
- **推荐行动**: ${r.recommendations.join('；') || '无'}
`).join('\n')}

### 大模型深度评估与临床背景
${payload.llm_analysis ? `
- **增强总结**: ${payload.llm_analysis.enhanced_summary || '无'}
- **临床背景**: ${payload.llm_analysis.clinical_context || '无'}
- **风险叙述**: ${payload.llm_analysis.risk_narrative || '无'}
- **建议措施**: ${payload.llm_analysis.suggestions.join('；') || '无'}
- **局限性**: ${payload.llm_analysis.limitations.join('；') || '无'}
` : '（大模型评估未生成或未同步）'}
        `,
        markdownReport: payload.llm_analysis?.enhanced_summary || payload.integrated_report?.summary || ''
      };

      const assessment: Assessment = {
        id: crypto.randomUUID(),
        sessionId,
        patientId: patient.id,
        type: 'combined',
        mode: 'stepped',
        createdAt: Date.now(),
        data: {
          posture: postureData
        },
        notes: `由早筛同步导入: ${payload.session_id}`,
        status: 'completed'
      };

      const session = {
        id: sessionId,
        patientId: patient.id,
        sequence,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        assessments: [assessment],
        status: 'completed' as const,
        notes: `由早筛同步导入会话: ${payload.session_id}`
      };

      // Ingest transactional records
      await db.transaction('rw', [db.sessions, db.assessments], async () => {
        await db.sessions.add(session);
        await db.assessments.add(assessment);
      });

      // Reload patients in state
      const patients = await db.patients.orderBy('createdAt').reverse().toArray();
      set({
        patients,
        currentPatient: patient,
        isLoading: false
      });

      return patient;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '导入失败', isLoading: false });
      throw error;
    }
  },

  importScaleAssessment: async (patientId: string, scaleData: ScaleAssessmentData, sessionId?: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const patient = await db.patients.get(patientId);
      if (!patient) throw new Error('患者不存在');

      let targetSessionId = sessionId;
      let sequence = 1;

      if (!targetSessionId) {
        // Find latest session or create a new one
        const sessions = await db.sessions.where('patientId').equals(patientId).toArray();
        if (sessions.length > 0) {
          // Sort by sequence or createdAt descending
          sessions.sort((a, b) => b.createdAt - a.createdAt);
          targetSessionId = sessions[0].id;
          sequence = sessions[0].sequence;
        } else {
          targetSessionId = generatePatientId() + '_S1';
          const newSession = {
            id: targetSessionId,
            patientId,
            sequence: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            assessments: [],
            status: 'completed' as const,
            notes: '自动创建于量表导入'
          };
          await db.sessions.add(newSession);
        }
      }

      // Create a scale assessment record
      const scaleAssessment: Assessment = {
        id: crypto.randomUUID(),
        sessionId: targetSessionId,
        patientId,
        type: 'scale',
        mode: 'stepped',
        createdAt: Date.now(),
        data: {
          scale: scaleData
        },
        notes: `量表评估导入: ${scaleData.scaleName} (得分: ${scaleData.totalScore}/${scaleData.maxScore})`,
        status: 'completed'
      };

      // Add to assessments table
      await db.assessments.add(scaleAssessment);

      // Append to the session's assessments list
      const session = await db.sessions.get(targetSessionId);
      if (session) {
        const currentAssessments = session.assessments || [];
        session.assessments = [...currentAssessments, scaleAssessment];
        session.updatedAt = Date.now();
        await db.sessions.put(session);
      }

      // Also update patient's updatedAt
      await db.patients.update(patientId, { updatedAt: Date.now() });

      // Reload patients list to keep state fresh
      const patients = await db.patients.orderBy('createdAt').reverse().toArray();
      set((state) => {
        const nextCurrent = state.currentPatient?.id === patientId ? { ...state.currentPatient, updatedAt: Date.now() } : state.currentPatient;
        return {
          patients,
          currentPatient: nextCurrent,
          isLoading: false
        };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '量表导入失败', isLoading: false });
      throw error;
    }
  }
}));

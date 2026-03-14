import type { Assessment } from '@/types/assessment';
import type {
  AssessmentOutputSummary,
  SessionReportGenerationRequest,
  SessionReportInput,
  SessionReportInputStatus,
  SessionReportInputType,
} from '@/types/report-center';
import { sanitizeReadableText } from '@/components/shared/MarkdownReport';
import { buildImmediateBasicReport } from '@/plugins/vision3/report-insights';

const structuredCaseToMarkdown = (structuredCase: Record<string, string | undefined> | undefined): string | null => {
  if (!structuredCase) {
    return null;
  }

  const sections = Object.entries(structuredCase)
    .filter(([, value]) => Boolean(value && String(value).trim().length > 0))
    .map(([key, value]) => `## ${key}\n${String(value).trim()}`);

  return sections.length > 0 ? sections.join('\n\n') : null;
};

const getPostureStatus = (assessment: Assessment): SessionReportInputStatus => {
  if (assessment.data.posture?.markdownReport || assessment.data.posture?.auxiliaryDiagnosis) {
    return 'ready';
  }

  if (assessment.data.posture?.metrics || (assessment.data.posture?.issues?.length ?? 0) > 0) {
    return 'partial';
  }

  return 'missing';
};

const getRomStatus = (assessment: Assessment): SessionReportInputStatus => {
  if (assessment.data.rom?.summary || (assessment.data.rom?.recommendations?.length ?? 0) > 0) {
    return 'ready';
  }

  if ((assessment.data.rom?.items?.length ?? 0) > 0) {
    return 'partial';
  }

  return 'missing';
};

const getMedVoiceStatus = (assessment: Assessment): SessionReportInputStatus => {
  if (structuredCaseToMarkdown(assessment.data.medvoice?.structuredCase)) {
    return 'ready';
  }

  if (assessment.data.medvoice?.transcript?.trim()) {
    return 'partial';
  }

  return 'missing';
};

export function getAssessmentPreview(assessment: Assessment): string | null {
  const sanitizePreview = (value?: string | null) => {
    const cleaned = sanitizeReadableText(value);
    return cleaned || null;
  };

  if (assessment.data.posture?.markdownReport) {
    return sanitizePreview(assessment.data.posture.markdownReport);
  }

  if (assessment.data.posture?.auxiliaryDiagnosis) {
    return sanitizePreview(assessment.data.posture.auxiliaryDiagnosis);
  }

  if (assessment.data.posture?.metrics || (assessment.data.posture?.issues?.length ?? 0) > 0) {
    return sanitizePreview(buildImmediateBasicReport({
      metrics: assessment.data.posture.metrics,
      issues: assessment.data.posture.issues,
    }));
  }

  if (assessment.data.rom?.summary) {
    return sanitizePreview(assessment.data.rom.summary);
  }

  const structuredCaseMarkdown = structuredCaseToMarkdown(assessment.data.medvoice?.structuredCase);
  if (structuredCaseMarkdown) {
    return sanitizePreview(structuredCaseMarkdown);
  }

  if (assessment.data.medvoice?.transcript) {
    return sanitizePreview(assessment.data.medvoice.transcript);
  }

  return null;
}

export function hasAssessmentReportPayload(assessment: Assessment): boolean {
  return Boolean(getAssessmentPreview(assessment));
}

export function buildAssessmentOutputSummary(assessment: Assessment): AssessmentOutputSummary | null {
  const preview = getAssessmentPreview(assessment);

  if (assessment.type === 'posture') {
    return {
      assessmentId: assessment.id,
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      type: 'posture',
      title: '体态评估',
      status: getPostureStatus(assessment),
      createdAt: assessment.createdAt,
      preview,
      evidenceCount: Object.keys(assessment.data.posture?.metrics ?? {}).length + (assessment.data.posture?.issues?.length ?? 0),
      sourceAssessment: assessment,
    };
  }

  if (assessment.type === 'rom') {
    return {
      assessmentId: assessment.id,
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      type: 'rom',
      title: '关节活动度',
      status: getRomStatus(assessment),
      createdAt: assessment.createdAt,
      preview,
      evidenceCount: assessment.data.rom?.items?.length ?? 0,
      sourceAssessment: assessment,
    };
  }

  if (assessment.type === 'medvoice') {
    return {
      assessmentId: assessment.id,
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      type: 'medvoice',
      title: '语音病历',
      status: getMedVoiceStatus(assessment),
      createdAt: assessment.createdAt,
      preview,
      evidenceCount: Object.values(assessment.data.medvoice?.structuredCase ?? {}).filter((value) => Boolean(value && String(value).trim())).length,
      sourceAssessment: assessment,
    };
  }

  return null;
}

const inputTypes: SessionReportInputType[] = ['posture', 'rom', 'medvoice'];

export function buildSessionReportInputs(
  assessments: Assessment[],
  patientNameById?: Map<string, string>,
): SessionReportInput[] {
  const grouped = new Map<string, SessionReportInput>();

  for (const assessment of assessments) {
    const summary = buildAssessmentOutputSummary(assessment);
    if (!summary) {
      continue;
    }

    const existing = grouped.get(assessment.sessionId) ?? {
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      patientName: patientNameById?.get(assessment.patientId),
      outputs: {},
      latestCreatedAt: assessment.createdAt,
      readiness: {
        readyCount: 0,
        partialCount: 0,
        missingTypes: [...inputTypes],
        availableTypes: [],
      },
    };

    const currentForType = existing.outputs[summary.type];
    if (!currentForType || currentForType.createdAt < summary.createdAt) {
      existing.outputs[summary.type] = summary;
    }

    if (assessment.createdAt > existing.latestCreatedAt) {
      existing.latestCreatedAt = assessment.createdAt;
    }

    grouped.set(assessment.sessionId, existing);
  }

  return Array.from(grouped.values())
    .map((sessionInput) => {
      const availableTypes = inputTypes.filter((type) => Boolean(sessionInput.outputs[type]));
      const readyCount = availableTypes.filter((type) => sessionInput.outputs[type]?.status === 'ready').length;
      const partialCount = availableTypes.filter((type) => sessionInput.outputs[type]?.status === 'partial').length;

      return {
        ...sessionInput,
        readiness: {
          readyCount,
          partialCount,
          availableTypes,
          missingTypes: inputTypes.filter((type) => !sessionInput.outputs[type]),
        },
      };
    })
    .sort((left, right) => right.latestCreatedAt - left.latestCreatedAt);
}

export function buildSessionReportGenerationRequest(sessionInput: SessionReportInput): SessionReportGenerationRequest {
  return {
    sessionId: sessionInput.sessionId,
    patientId: sessionInput.patientId,
    patientName: sessionInput.patientName,
    sourceAssessmentIds: Object.values(sessionInput.outputs).map((output) => output.assessmentId),
    readiness: sessionInput.readiness,
    posture: sessionInput.outputs.posture
      ? {
          title: sessionInput.outputs.posture.title,
          status: sessionInput.outputs.posture.status,
          preview: sessionInput.outputs.posture.preview,
          evidenceCount: sessionInput.outputs.posture.evidenceCount,
        }
      : undefined,
    rom: sessionInput.outputs.rom
      ? {
          title: sessionInput.outputs.rom.title,
          status: sessionInput.outputs.rom.status,
          preview: sessionInput.outputs.rom.preview,
          evidenceCount: sessionInput.outputs.rom.evidenceCount,
        }
      : undefined,
    medvoice: sessionInput.outputs.medvoice
      ? {
          title: sessionInput.outputs.medvoice.title,
          status: sessionInput.outputs.medvoice.status,
          preview: sessionInput.outputs.medvoice.preview,
          evidenceCount: sessionInput.outputs.medvoice.evidenceCount,
        }
      : undefined,
  };
}
